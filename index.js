const { Telegraf } = require('telegraf') //импортуємо телеграф
const sqlite3 = require('sqlite3').verbose() //импортуємо sqlite3 

const bot = new Telegraf('6373366804:AAE5_alofKpDkRmufoFt3XjEIhcOJufKUgM') // створюєио бота

const db = new sqlite3.Database('db.sqlite3') // створюємо об'єкт Бази Даних



function createUserTable(){ // функція створення БД Юзера
    const query = `CREATE TABLE Users(
        id INTEGER PRIMARY KEY,
        status varchar(255),
        friend int
    );`
    db.run(query)
}
// createUserTable()

function addUser(id){ // функція додання бзера до БД з початковим статусом "пошук"
    const query = `INSERT INTO Users (id, status) VALUES(?,?)`
    db.run(query, [id,"in_search"])
}

function getUser(id, callback){ // функція взятя списку юзерів з БД та додання функції з ним
    const query = `SELECT status, friend FROM Users WHERE id = ${id}`
    db.get(query, (err, res) => {
        callback(res)
    } )
}

function updateStatus(id, status){ // зміна статусу юзера у БД
    const query = `UPDATE Users SET status = '${status}' WHERE id = ${id}`
    db.run(query)
}

function updateFriend(id, friend){ // зміна твого співрозмовника
    const query = `UPDATE Users SET friend = ${friend} WHERE id = ${id}`
    db.run(query)
}

function getInSearchUsers(id, callback){ // пошук усіх юзерів з статусом "Пошук" та додання функції з ними
    const query = `SELECT id FROM Users WHERE status = 'in_search' AND id <> ${id}`
    db.all(query, (err, res) => {
        callback(res)
    })
}


function findFriend(id){ // функція пошуку співрозмовника
    getInSearchUsers(id,(res)=>{
        if (res.length > 0){ // якщо у бд є учасники окрім тебе
            const index = Math.floor(Math.random()*res.length) // беремо рандомний індекс юзера
            const randomUser = res[index] // вибираєио цього юзера за індексом
            updateStatus(id, 'meet') // змінюємо свій статус та татус співрозмовника на "зучстріч"
            updateStatus(randomUser.id, 'meet')
            updateFriend(id, randomUser.id) // додаємо одне одного на співрозмовника
            updateFriend(randomUser.id, id)
            bot.telegram.sendMessage(randomUser.id,"Співрозмовника знайдено. Можете спілкуватись") // і так усе видно
            bot.telegram.sendMessage(id,"Співрозмовника знайдено. Можете спілкуватись")
        }
    })
}

bot.start((ctx) =>{ // реакція на команду СТАРТ
    getUser(ctx.from.id, (res) => {
        if (res){ // якщо є юзер
            if(res.status == "standart"){ // якщо статус Стандарт, тошукаємо співрозмовника
                updateStatus(ctx.from.id, "in_search");
                ctx.reply('Шукаємо співрозмовника')
                findFriend(ctx.from.id)
            } else if(res.status == "in_search"){ // показуємо що бот вже у пошуку співрозмовника
                ctx.reply('Ми вже шукаємо співрозмовника')
            } else if(res.status == "meet"){  // повідомлення про початок зустрічі
                ctx.reply('У вас вже є співрозмовник напишіть /stop щоб зупинити бесіду')
            }
        } else{ // якщо юзера немає
            addUser(ctx.from.id) // додаємо його
            ctx.reply('Шукаємо співрозмовника')
            findFriend(ctx.from.id) // шукаємо співрозмовника
        }
    })
})

bot.command("stop", (ctx)=>{ // реакція на команду СТОП
    getUser(ctx.from.id, (res)=>{
        if (res){// якщо є співрозмовник
            if (res.status == "meet"){ // якщо він у зустрічі
                updateStatus(ctx.from.id, "standart") // хмінюєо статуси співрозмовників на СТАНДАРТ та відаляємо їч з співрозмовників
                updateFriend(ctx.from.id, null)
                updateStatus(res.friend, 'standart')
                updateFriend(res.friend, null)
                ctx.reply('Розмову закінчено.')
                bot.telegram.sendMessage(res.friend,'Співрозмовник завершив бесіду.')
            } else{ // якщо ви не говорили
                ctx.reply("У вас немає співрозмовника.")
            }
        }
    })
})

bot.on('text',(ctx)=>{ // реакція на текст
    getUser(ctx.from.id,(res)=>{ 
        if (res){ // якщо є співрозмовник
            if (res.status == 'meet'){ // відправляємо одне одному повідомлення при зустрічі
                bot.telegram.sendMessage(res.friend,ctx.message.text)
            } else { // якщо ві не у зустрічі
                ctx.reply('З ким ви спілкуєтесь?')
            }
        } else { // якщо ві не знайшли співрозмовника
            ctx.reply('Напишіть /start щоб знайти співрозмовника.')
        }
    })
})

bot.launch()  // запуск бота

