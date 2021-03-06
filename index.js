const url = require('url'),
    AutoUpdater = require('auto-updater'),
    fs = require('fs'),
    {
        VK
    } = require('vk-io');
const {
    VCoinWS,
    miner,
    Entit
} = require('./VCoinWS');
const open = require('open');
const {
    con,
    ccon,
    dateF,
    setColorsM,
    formatScore,
    rl,
    existsFile,
    existsAsync,
    writeFileAsync,
    appendFileAsync,
    setTerminalTitle,
    getVersion,
    infLog,
    rand,
    onUpdates,
    beep,
    mathPrice,
} = require('./helpers');
let {
    USER_ID: depUSER_ID,
    DONEURL,
    VK_TOKEN,
    USERNAME,
    PASSWORD,
    GROUP_ID
} = existsFile('./config.js') ? require('./config.js') : {};
let USER_ID = false;
let vk = new VK();
let URLWS = false;
let boosterTTL = null,
    tryStartTTL = null,
    xRestart = true,
    flog = false,
    offColors = false,
    autoBuy = false,
    autoBuyItems = ["datacenter"],
    smartBuyItem = "",
    smartBuy = false,
    limitCPS = 50000,
    autobeep = false,
    hidejunk = false,
    tforce = false,
    transferTo = false,
    transferCoins = 3e4,
    transferPercent = 0,
    transferInterval = 36e2,
    transferLastTime = 0,
    lastTry = 0,
    numberOfTries = 3,
    currentServer = 0,
    backupTokens = true,
    backupLinks = true,
    authAppType = "iphone",
    checkUpdates = true,
    updatesInterval = 60,
    autoUpdate = true,
    updateOnce = false,
    needRestart = false,
    tried2FA = false,
    triedCaptcha = false,
    tranPerPage = 20;
var tempDataUpdate = {
    "canSkip": false,
    "itemPrice": null,
    "itemName": null,
    "transactionInProcess": false,
    "percentForBuy": 100,
    "tmpPr": null,
    "onBrokenEvent": true,
};
var autoupdater = new AutoUpdater({
    checkgit: true
});
    autoupdater.on('git-clone', function() {
      con("Автоматическое обновление не работает, т.к. вы клонировали репозиторий! Для автоматического обновления удалите папку .git", "white", "Red");
    });
    autoupdater.on('check.up-to-date', function(v) {
        con("У вас установлена актуальная версия: " + v, "white", "Green");
    });
    autoupdater.on('check.out-dated', function(v_old, v) {
        con("У вас устаревшая версия: " + v_old, "white", "Red");
        if (!autoUpdate && !updateOnce) {
            con("Актуальная версия: " + v + ". Для ее установки введите команду update", "white", "Red");
        } else {
            con("Актуальная версия: " + v + ". Приступаю к обновлению...", "white", "Green");
            autoupdater.fire('download-update');
        }
    });
    autoupdater.on('update.downloaded', function() {
      con("Обновление успешно загружено! Начинаю установку...", "white", "Green");
      autoupdater.fire('extract');
    });
    autoupdater.on('update.not-installed', function() {
      con("Обновление уже загружено! Начинаю установку...", "white", "Green");
      autoupdater.fire('extract');
    });
    autoupdater.on('update.extracted', function() {
        con("Обновление успешно установлено!", "white", "Green");
        needRestart = true;
        let depDiff = autoupdater.fire('diff-dependencies');
        con("Для применения обновления ТРЕБУЕТСЯ ПЕРЕЗАПУСК БОТА!", "white", "Green");
        if (depDiff.count > 0)
            con("У обновленной версии изменились зависимости, поэтому не забудьте перед запуском бота произвести установку пакетов с помощью 1_install.bat или 1_install.sh", "white", "Red");
    });
    autoupdater.on('download.start', function(name) {
        con("Начинаю загрузку " + name, "white", "Green");
    });
    autoupdater.on('download.end', function(name) {
        con("Завершена загрузка " + name, "white", "Green");
    });
    autoupdater.on('download.error', function(err) {
        con("Возникла ошибка при загрузке: " + err, "white", "Red");
    });
    autoupdater.on('end', function(name, e) {
        if (checkUpdates) {
            setTimeout(function() { autoupdater.fire('check'); }, (updatesInterval * 60 + Math.random() * 600) * 1000);
        }
        updateOnce = false;
    });
    autoupdater.on('error', function(name, e) {
        console.error(name, e);
        if (checkUpdates) {
            setTimeout(function() { autoupdater.fire('check'); }, (updatesInterval * 60 + Math.random() * 600) * 1000);
        }
    });
if (checkUpdates)
    setTimeout(function() { autoupdater.fire('check'); }, Math.random() * 60 * 1000);
function notifyToRestart() {
    if (needRestart)
        con("Для применения обновления ТРЕБУЕТСЯ ПЕРЕЗАПУСК БОТА!", "white", "Green");
}
setInterval(notifyToRestart, 5 * 60 * 1000);

let vCoinWS = new VCoinWS();
let missCount = 0,
    missTTL = null;
vCoinWS.onMissClickEvent(_ => {
    if (0 === missCount) {
        clearTimeout(missTTL);
        missTTL = setTimeout(_ => {
            missCount = 0;
            return;
        }, 6e4)
    }
    if (++missCount > 20)
        forceRestart(4e3);
    if (++missCount > 10) {
        if (autobeep)
            beep();
        con("Плохое соединение с сервером, бот был приостановлен.", true);
    }
});
vCoinWS.onReceiveDataEvent(async (place, score) => {

    miner.setScore(score);
    setTerminalTitle("VCoinX " + getVersion() + " (id" + USER_ID.toString() + ") > " + formatScore(vCoinWS.tick, true) + " cps > " + "top " + place + " > " + formatScore(score, true) + " coins.");
    if (place > 0 && !rl.isQst) {

        if (!hidejunk)
            con("Скорость: " + formatScore(vCoinWS.tick, true) + " cps\tТоп: " + place + "\tКоины: " + formatScore(score, true), "yellow");

        if (transferPercent) {
            transferCoins = Math.floor(score / 1000 * (transferPercent / 100))
        }
        if (transferTo && (transferCoins * 1e3 < score || transferCoins * 1e3 >= 9e9) && ((Math.floor(Date.now() / 1000) - transferLastTime) > transferInterval)) {
            try {
                let template;
                if (transferCoins * 1e3 >= 9e9) {
                    await vCoinWS.transferToUser(transferTo, score / 1e3);
                    template = "Автоматически переведено [" + formatScore(score * 1e3, true) + "] коинов с активного аккаунта (@id" + USER_ID + ") на @id" + transferTo;
                } else {
                    let minCoins = Math.min(score / 1000, transferCoins);
                    await vCoinWS.transferToUser(transferTo, minCoins);
                    template = "Автоматически переведено [" + formatScore(minCoins * 1e3, true) + "] коинов с активного аккаунта (@id" + USER_ID + ") на @id" + transferTo;
                }
                transferLastTime = Math.floor(Date.now() / 1000);
                con(template, "black", "Green");
                try {
                    await infLog(template);
                } catch (e) {}
            } catch (e) {
                con("Автоматический перевод не удался. Ошибка: " + e.message, true);
            }
        }
        if (autoBuy && vCoinWS.tick <= limitCPS && score > 0) {
            for (var i = 0; i < autoBuyItems.length; i++) {
                if (miner.hasMoney(autoBuyItems[i])) {
                    try {
                        result = await vCoinWS.buyItemById(autoBuyItems[i]);
                        miner.updateStack(result.items);
                        let template = "Автоматической покупкой был приобретен " + Entit.titles[autoBuyItems[i]];;
                        ccon(template, "black", "Green");
                        con("Новая скорость: " + formatScore(result.tick, true) + " коинов / тик.");
                        try {
                            await infLog(template);
                        } catch (e) {}
                    } catch (e) {
                        if (e.message == "NOT_ENOUGH_COINS") con("Недостаточно средств для приобретения.", true);
                        else if (e.message == "ITEM NOT FOUND") con("Предмет не найден.", true);
                        else con(e.message, true);
                    }
                }
            }
        }
        if (smartBuy && vCoinWS.tick <= limitCPS && score > 0)
            smartBuyFunction(score);
    }
});
vCoinWS.onTransfer(async (id, score) => {
    let template = "Активный пользователь (@id" + USER_ID + ") получил [" + formatScore(score, true) + "] коинов от @id" + id;
    ccon(template, "green", "Black");
    try {
        await infLog(template);
    } catch (e) {
        console.error(e);
    }
});
vCoinWS.onUserLoaded((place, score, items, top, firstTime, tick, digits, tx) => {
    con("Пользователь успешно загружен.");
    con("Скорость: " + formatScore(tick, true) + " коинов / тик.");

    if (digits && digits.length > 0) {
        digits.forEach(function(el) {
            let trend = "0";
            if (el.trend) {
                if (el.trend > 0) {
                    trend = "+" + formatScore(Math.abs(el.trend), true);
                } else if (el.trend < 0) {
                    trend = "-" + formatScore(Math.abs(el.trend), true);
                }
            }
            con(el.description + ": " + formatScore(el.value, true) + " (" + trend  + ")");
        });
    }

    con("История переводов: " + tx.length);

    setTerminalTitle("VCoinX " + getVersion() + " (id" + USER_ID.toString() + ") > " + formatScore(tick, true) + " cps > " + "top " + place + " > " + formatScore(score, true) + " coins.");

    miner.setScore(score);
    miner.setActive(items);
    miner.updateStack(items);

    lastTry = 0;
    boosterTTL && clearInterval(boosterTTL);
    boosterTTL = setInterval(_ => {
        rand(0, 5) > 3 && vCoinWS.click();
    }, 5e2);
});
vCoinWS.onGroupLoaded((groupInfo, groupData) => {
    if (groupData.name && groupInfo.place && groupInfo.score) {
        con("Загружена информация о группе " + groupData.name);
        con("Топ группы: " + groupInfo.place);
        con("Коины группы: " + formatScore(groupInfo.score, true) + " коинов.");
    }
});
vCoinWS.onBrokenEvent(_ => {
    con("Обнаружен brokenEvent, видимо сервер сломался.\n\t\tЧерез 10 секунд будет выполнен перезапуск.", true);
    setTerminalTitle("VCoinX " + getVersion() + " (id" + USER_ID.toString() + ") > " + "BROKEN");
    tempDataUpdate["onBrokenEvent"] = true;
    xRestart = false;
    if (autobeep)
        beep();
    lastTry++;
    if (lastTry >= numberOfTries) {
        lastTry = 0;
        currentServer = currentServer >= 2 ? 0 : currentServer + 1;
        con("Достигнут лимит попыток подключиться к серверу.\n\t\t\tПроизводится смена сервера...", true);
        updateLink();
    }
    forceRestart(1e4, true);
});
vCoinWS.onAlreadyConnected(_ => {
    con("Обнаружено открытие приложения с другого устройства.\n\t\tЧерез 60 секунд будет выполнен перезапуск.", true);
    setTerminalTitle("VCoinX " + getVersion() + " (id" + USER_ID.toString() + ") > " + "ALREADY_CONNECTED");
    if (autobeep)
        beep();
    forceRestart(6e4, true);
});
vCoinWS.onOffline(_ => {
    if (!xRestart) return;
    if (tryStartTTL) return;
    con("Пользователь отключен от сервера.\n\t\tЧерез 10 секунд будет выполнен перезапуск.", true);
    if (autobeep)
        beep();
    lastTry++;
    if (lastTry >= numberOfTries) {
        lastTry = 0;
        currentServer = currentServer >= 2 ? 0 : currentServer + 1;
        con("Достигнут лимит попыток подключиться к серверу.\n\t\t\tПроизводится смена сервера...", true);
        updateLink();
    }
    setTerminalTitle("VCoinX " + getVersion() + " (id" + USER_ID.toString() + ") > " + "OFFLINE");
    forceRestart(1e4, true);
});
async function startBooster(tw) {
    tryStartTTL && clearTimeout(tryStartTTL);
    tryStartTTL = setTimeout(() => {
        con("VCoinX загружается...");
        vCoinWS.userId = USER_ID;
        vCoinWS.run(URLWS, GROUP_ID, _ => {
            con("VCoinX загружен...");
            xRestart = true;
        });
    }, (tw || 1e3));
}

function forceRestart(t, force) {
    vCoinWS.close();
    boosterTTL && clearInterval(boosterTTL);
    setTerminalTitle("VCoinX " + getVersion() + " (id" + USER_ID.toString() + ") > " + "RESTARTING");
    if (xRestart || force)
        startBooster(t);
}

function lPrices(d) {
    let temp;
    temp = Entit.names.map(el => {
        return !miner.hasMoney(el) && d ? "" : "\n> [" + el + "] " + Entit.titles[el] + " (" + miner.getItemCount(el) + " > " + (miner.getItemCount(el) + 1) + ") - " + formatScore(miner.getPriceForItem(el)) + " коинов";
    }).toString();
    return temp;
}

function justPrices(d) {
    temp = Entit.names.map(el => {
        return !miner.hasMoney(el) && d ? "" : miner.getPriceForItem(el);
    });
    return temp;
}
rl.on('line', async (line) => {
    if (!URLWS) return;
    let temp, item;
    let textLine = line.trim().toLowerCase().split(" ");
    switch (textLine[0]) {
        case '':
            break;
        case 'debuginformation':
        case 'debuginfo':
        case 'debug':
            console.log("updatesInterval", updatesInterval);
            console.log("xRestart", xRestart);
            console.log("autobuy", autoBuy);
            console.log("smartbuy", smartBuy);
            console.log("transferTo", transferTo);
            console.log("transferCoins", transferCoins);
            console.log("transferInterval", transferInterval);
            console.log("transferLastTime", transferLastTime);
            break;
        case 'i':
        case 'info':
            con("Текущая версия бота: " + getVersion());
            con("ID авторизованного пользователя: " + USER_ID.toString());
            con("Текущее количество коинов: " + formatScore(vCoinWS.confirmScore, true));
            con("Текущая скорость: " + formatScore(vCoinWS.tick, true) + " коинов / тик.\n");
            break;
        case 'color':
            setColorsM(offColors = !offColors);
            con("Цвета " + (offColors ? "от" : "в") + "ключены. (*^.^*)", "blue");
            break;
        case "stop":
        case "pause":
            xRestart = false;
            vCoinWS.close();
            break;
        case "start":
        case "run":
            if (vCoinWS.connected)
                return con("VCoinX уже запущен и работает!");
            xRestart = true;
            startBooster();
            break;
        case 'b':
        case 'buy':
            temp = lPrices(true);
            ccon("-- Доступные ускорения и их цены --", "red");
            ccon(temp);
            item = await rl.questionAsync("Введите название ускорения [cursor, cpu, cpu_stack, computer, server_vk, quantum_pc, datacenter]: ");
            var array = item.split(" ");
            for (var i = 0, j = array.length; i < j; i++) {
                if (!array[i]) return;
                let result;
                try {
                    result = await vCoinWS.buyItemById(array[i]);
                    miner.updateStack(result.items);
                    if (result && result.items)
                        delete result.items;
                    con("Новая скорость: " + formatScore(result.tick, true) + " коинов / тик.");
                } catch (e) {
                    if (e.message == "NOT_ENOUGH_COINS") con("Недостаточно средств для приобретения.", true);
                    else if (e.message == "ITEM NOT FOUND") con("Предмет не найден.", true);
                    else con(e.message, true);
                }
            }
            break;
        case 'autobuyitem':
            item = await rl.questionAsync("Введите название ускорения для автоматической покупки [cursor, cpu, cpu_stack, computer, server_vk, quantum_pc, datacenter]: ");
            var array = item.split(" ");
            for (var i = 0; i < array.length; i++) {
                if (!item || !Entit.titles[array[i]]) return;
                con("Для автоматической покупки установлено ускорение: " + Entit.titles[array[i]]);
            }
            autoBuyItems = array;
            break;
        case 'ab':
        case 'autobuy':
            autoBuy = !autoBuy;
            con("Автопокупка: " + (autoBuy ? "Включена" : "Отключена"));
            smartBuy = false;
            con("Умная покупка: " + (smartBuy ? "Включена" : "Отключена"));
            break;
        case 'sb':
        case 'smartbuy':
            smartBuy = !smartBuy;
            con("Умная покупка: " + (smartBuy ? "Включена" : "Отключена"));
            autoBuy = false;
            con("Автопокупка: " + (autoBuy ? "Включена" : "Отключена"));
            break;
        case 'setcps':
        case 'scp':
        case 'sl':
        case 'setlimit':
            item = await rl.questionAsync("Введите новый лимит коинов / тик для SmartBuy & AutoBuy: ");
            limitCPS = parseInt(item.replace(/,/g, ''));
            con("Установлен новый лимит коинов / тик для SmartBuy & AutoBuy: " + formatScore(limitCPS, true));
            break;
        case 'to':
            item = await rl.questionAsync("Введите ID пользователя: ");
            transferTo = parseInt(item.replace(/\D+/g, ""));
            con("Автоматический перевод коинов на @id" + transferTo);
            break;
        case 'ti':
            item = await rl.questionAsync("Введите интервал: ");
            transferInterval = parseInt(item);
            con("Интервал для автоматического перевода " + transferInterval + " секунд.");
            break;
        case 'tsum':
            item = await rl.questionAsync("Введите сумму: ");
            transferCoins = parseInt(item);
            con("Количество коинов для автоматического перевода " + transferCoins + "");
            break;
        case 'tperc':
            item = await rl.questionAsync("Введите процент: ");
            transferPercent = parseInt(item);
            con("Процент коинов для автоматического перевода: " + transferPercent + "%");
            break;
        case 'autobeep':
        case 'beep':
            autobeep = !autobeep;
            con("Автоматическое проигрывание звука при ошибках " + autobeep ? "включено" : "отключено" + ".");
            break;
        case 'p':
        case 'price':
        case 'prices':
            temp = lPrices(false);
            ccon("-- Цены --", "red");
            ccon(temp);
            break;
        case 'pay':
        case 'tran':
        case 'transfer':
            let count = await rl.questionAsync("Количество: ");
            let id = await rl.questionAsync("ID получателя: ");
            let userinfo = (await vk.api.users.get({
                user_ids: id
            }));
            id = userinfo[0].id;
            console.log("Вы собираетесь перевести перевести " + formatScore(count * 1e3, true) + " коин(а)(ов) пользователю [" + userinfo[0].first_name + " " + userinfo[0].last_name + '] (@id' + userinfo[0].id + ').');

            let conf = await rl.questionAsync("Вы уверены? [yes]: ");
            if (conf.toLowerCase() != "yes".replace(/[^a-zA-Z ]/g, "") || !id || !count) return con("Отправка не была произведена, вероятно, один из параметров не был указан.", true);
            try {
                await vCoinWS.transferToUser(id, count);
                let template = "Успешно была произведена отправка [" + formatScore(count * 1e3, true) + "] коинов от активного аккаунта (@id" + USER_ID.toString() + ") для @id" + id.toString();
                con(template, "black", "Green");
                try {
                    await infLog(template);
                } catch (e) {}
            } catch (e) {
                if (e.message == "BAD_ARGS") con("Вероятно, вы где-то указали неверный аргумент.", true);
                else con(e.message, true);
            }
            break;
        case 'gs':
        case 'getscore':
        case 'getuserscore':
          let userId = await rl.questionAsync('ID пользователя: ')
          let userData = (await vk.api.users.get({
            user_ids: userId,
          }))[0]['id']
          userId = userData
          try {
            let gscore = await vCoinWS.getUserScores([userId])
            con('Текущий баланс пользователя @id' + userId.toString() + ': ' + formatScore(gscore[userId], true) + ' коинов.')
          } catch (e) {
            console.error('Ошибка при получении баланса:', e)
          }
          break;
         case 'tx':
         case 'gettx':
         case 'transfers':
            printTxList(textLine[1]);
            break;
        case 'psb':
        case 'pfsb':
        case 'percforsmartbuy':
        case 'percentforsmartbuy':
            var proc = await rl.questionAsync("Введи процентное соотношение, выделяемое под SmartBuy: ");
            if (parseInt(proc))
                if (parseInt(proc) > 0 && parseInt(proc) <= 100) {
                    tempDataUpdate["percentForBuy"] = parseInt(proc);
                    tempDataUpdate["tmpPr"] = null;
                    tempDataUpdate["canSkip"] = false;
                }
            break;
        case 'u':
        case 'upd':
        case 'update':
            updateOnce = true;
            autoupdater.fire('check');
            break;
        case 'au':
        case 'autoupd':
        case 'autoupdate':
            autoUpdate = !autoUpdate;
            con("Автоматическое обновление " + autoUpdate ? "включено" : "отключено" + ".");
            break;
        case 'cu':
        case 'checkupd':
        case 'checkupdates':
            checkUpdates = !checkUpdates;
            con("Проверка обновлений " + checkUpdates ? "включена" : "отключена" + ".");
            break;
        case "?":
        case "help":
            ccon("-- VCoinX --", "red");
            ccon("info - отображение основной информации.");
            ccon("debug - отображение тестовой информации.");
            ccon("stop(pause)	- остановка майнера.");
            ccon("start(run)	- запуск майнера.");
            ccon("(b)uy	- покупка улучшений.");
            ccon("(p)rice - отображение цен на товары.");
            ccon("tran(sfer)	- перевод игроку.");
            ccon("(u)pdate - установить обновление, если автообновление отключено.");
            ccon("checkupd(ates) - включить/отключить автоматическую проверку обновлений.");
            ccon("(au)toupdate - включить/отключить автоматическую установку обновлений.");
            ccon("to - указать ID и включить авто-перевод средств на него.");
            ccon("ti - указать интервал для авто-перевода (в секундах).");
            ccon("tsum - указать сумму для авто-перевода (без запятой).");
            ccon("autobuy - изменить статус авто-покупки.");
            ccon("autobuyitem - указать предмет(ы) для авто-покупки.");
            ccon("setlimit(sl) - установить лимит коинов / тик, до которого будет рабоать авто и умная покупка.");
            ccon("smartbuy - изменить статус умной покупки.")
            ccon("percentforsmartbuy - процент средств, выделяемый для приобретений улучшений с помощью умной покупки.");
            ccon("color - изменить цветовую схему консоли.");
            break;
    }
});
async function printTxList(page = 1) {
    let tx = await vCoinWS.getTxList();
    let txData = await vCoinWS.getTxData(tx);
    page = parseInt(page);
    if (page < 1) page = 1;
    try {
      if (txData.length > 0) {
          ccon("История переводов: " + txData.length, "white");
          let maxPage = Math.ceil(txData.length / tranPerPage);
          if (page > maxPage) page = maxPage;
          txData.reverse();
          txData = txData.slice((page - 1) * tranPerPage, (page - 1) * tranPerPage + tranPerPage);
          let idArray = txData.map(({ from_id }) => from_id);
          idArray = idArray.concat(txData.map(({ to_id }) => to_id));
          let cleanIdArray = [];
          idArray.forEach(function (value, index, self) {
            if (self.indexOf(value) === index) {
                cleanIdArray.push(value);
            }
          });
          let userInfo = (await vk.api.users.get({
              user_ids: cleanIdArray
          }));
          txData.forEach(function (el) {
              let template = dateF(el.created_at) + " -- ";
              let userData = userInfo.find(x => x.id === (el.from_id == USER_ID ? el.to_id : el.from_id));
              if (userData) {
                  template += "[" + userData.first_name + " " + userData.last_name + "] ";
              }
              template += "@id" + (el.from_id == USER_ID ? el.to_id : el.from_id);
              template += ", сумма: ";
              let amount = ccon((el.from_id == USER_ID ? "-" : "+") + formatScore(el.amount, true), (el.from_id == USER_ID ? "red" : "green"), false, true);
              console.log(ccon(template, "white", false, true) + amount);
          });
          ccon("Страница " + page + " из " + maxPage + " (для просмотра страницы введите tx " + page + ")", "white");
      } else {
          con('Переводов нет.');
      }
    } catch (e) {
      console.error('Ошибка при получении истории транзакций:', e)
    }
}
for (var argn = 2; argn < process.argv.length; argn++) {
    let cTest = process.argv[argn],
        dTest = process.argv[argn + 1];
    switch (cTest.trim().toLowerCase()) {
        case '-black':
            {
                flog && con("Цвета отключены (*^.^*)", "blue");
                setColorsM(offColors = !offColors);
                break;
            }
        case '-u':
        case '-user':
        case '-username':
            {
                if (dTest.length > 0) {
                    USERNAME = dTest.toString();
                    argn++;
                }
                break;
            }
        case '-p':
        case '-pass':
        case '-password':
            {
                if (dTest.length > 0) {
                    PASSWORD = dTest.toString();
                    argn++;
                }
                break;
            }
        case '-a':
        case '-app':
            {
                if (dTest.length > 0) {
                    authAppType = dTest.toString();
                    argn++;
                }
                break;
            }
        case '-g':
        case '-gid':
        case '-group':
            {
                if (dTest.length > 0) {
                    GROUP_ID = dTest.toString();
                    argn++;
                }
                break;
            }
        case '-t':
            {
                if (dTest.length > 80 && dTest.length < 90) {
                    VK_TOKEN = dTest.toString();
                    con("Успешно установлен токен: " + VK_TOKEN.toString() + ".", "blue");
                    argn++;
                }
                break;
            }
        case '-url':
            {
                if (dTest.length > 200 && dTest.length < 512) {
                    DONEURL = dTest;
                    argn++;
                }
                break;
            }
        case '-to':
            {
                if (dTest.length > 1 && dTest.length < 11) {
                    transferTo = parseInt(dTest.replace(/\D+/g, ""));
                    con("Включен автоматический перевод коинов на @id" + transferTo);
                    argn++;
                }
                break;
            }
        case '-autobuyitem':
            {
                if (typeof dTest == "string" && dTest.length > 1 && dTest.length < 20) {
                    if (!Entit.titles[dTest]) return;
                    con("Для автопокупки выбрано: " + Entit.titles[dTest]);
                    autoBuyItem = dTest;
                    argn++;
                }
                break;
            }
        case '-tforce':
            {
                tforce = true;
                break;
            }
        case '-tsum':
            {
                if (dTest.length >= 1 && dTest.length < 10) {
                    transferCoins = parseInt(dTest);
                    argn++;
                }
                break;
            }
        case '-tperc':
        case '-tpercent':
            {
                if (dTest.length >= 1 && dTest.length < 4) {
                    if (parseInt(dTest) < 1 || parseInt(dTest) > 100)
                        break;
                    transferPercent = parseInt(dTest);
                    con("Установлено количество коинов для автоматического перевода: " + transferPercent + "% коинов.");
                    argn++;
                }
                break;
            }
        case '-ti':
            {
                if (dTest.length >= 1 && dTest.length < 10) {
                    transferInterval = parseInt(dTest);
                    argn++;
                }
                break;
            }
        case '-flog':
            {
                flog = true;
                break;
            }
        case '-autobuy':
            {
                autoBuy = true;
                smartBuy = false;
                break;
            }
        case '-smartbuy':
            {
                if (parseInt(dTest)) {
                    if (parseInt(dTest) > 0 && parseInt(dTest) <= 100) tempDataUpdate["percentForBuy"] = parseInt(dTest);
                }
                smartBuy = true;
                autoBuy = false;
                break;
            }
        case '-sl':
        case '-setlimit':
            {
                if (dTest.length >= 1 && dTest.length < 10) {
                    limitCPS = parseInt(dTest);
                    con("Установлен лимит коинов / тик, до которого будет рабоать авто-закупка и умная покупка: " + limitCPS + " cps");
                    argn++;
                }
                break;
            }
        case '-ab':
        case '-autobeep':
            {
                autobeep = true;
                break;
            }
        case '-noupdates':
            {
                checkUpdates = false;
                autoUpdate = false;
                break;
            }
        case '-noautoupdates':
            {
                autoUpdate = false;
                break;
            }
        case '-h':
        case '-help':
            {
                ccon("-- VCoinB arguments --", "red");
                ccon("-help			  - помощь.");
                ccon("-flog			  - подробные логи.");
                ccon("-u [username]   - указать логин пользователя для автоматической авторизации.");
                ccon("-p [password]	  - указать пароль пользователя для автоматической авторизации.");
                ccon("-app [app]	  - указать вид приложения для автоматической авторизации (android, iphone, ipad, windows_phone, windows).");
                ccon("-tforce		  - принудительно использовать токен.");
                ccon("-tsum [sum]	  - включить функцию для авто-перевода.");
                ccon("-tperc [perc]	  - включить функцию для авто-перевода процента от коинов.");
                ccon("-to [id]		  - указать ID для авто-перевода.");
                ccon("-ti [seconds]	  - установить инетрвал для автоматического перевода.");
                ccon("-url [URL]	  - задать ссылку.");
                ccon("-t [TOKEN]	  - задать токен.");
                ccon("-setlimit [cps] - ограничить cps для автозакупки и умной покупки");
                ccon("-black          - отключить цвета консоли.");
                ccon("-noupdates      - отключить сообщение об обновлениях.");
                process.exit();
                continue;
            }
        default:
            con('Unrecognized param: ' + cTest + ' (' + dTest + ') ');
            break;
    }
}

async function smartBuyFunction(score) {
    if (tempDataUpdate["tmpPr"] == null) {
        tempDataUpdate["tmpPr"] = 100 / tempDataUpdate["percentForBuy"];
    }
    if (!tempDataUpdate["transactionInProcess"] && !tempDataUpdate["onBrokenEvent"]) {
        var names = ["cursor", "cpu", "cpu_stack", "computer", "server_vk", "quantum_pc", "datacenter"];
        var count = [1000, 333, 100, 34, 10, 2, 1];
        if (!tempDataUpdate["canSkip"]) {
            var prices = justPrices();
            Object.keys(count).forEach(function(id) {
                prices[id] = mathPrice(prices[id], count[id]);
            });
            min = Math.min.apply(null, prices);
            good = prices.indexOf(min);
            canBuy = names[good];
            con("Умной покупкой было проанализировано, что выгодно будет приобрести улучшение " + Entit.titles[canBuy] + ".", "green", "Black");
            con("Стоимость: " + formatScore(min, true) + " коинов за " + count[good] + " шт.", "green", "Black");
        } else {
            min = tempDataUpdate["itemPrice"];
            canBuy = tempDataUpdate["itemName"];
        }
        if ((score - min * tempDataUpdate["tmpPr"]) > 0) {
            tempDataUpdate["canSkip"] = false;
            tempDataUpdate["transactionInProcess"] = true;
            try {
                var countBuy = count[names.indexOf(canBuy)];
                while (countBuy) {
                    try {
                        result = await vCoinWS.buyItemById(canBuy);
                        miner.updateStack(result.items);
                        countBuy--;
                    } catch (e) {
                        if (!e.message == "ANOTHER_TRANSACTION_IN_PROGRESS") {
                            throw e;
                            tempDataUpdate["transactionInProcess"] = false;
                            break;
                        }
                    }
                }
                let template = "Умной покупкой был приобретен " + Entit.titles[canBuy] + " в количестве " + count[names.indexOf(canBuy)] + " шт.";
                tempDataUpdate["transactionInProcess"] = false;
                con(template, "green", "Black");
                try {
                    await infLog(template);
                } catch (e) {}
            } catch (e) {
                if (e.message == "NOT_ENOUGH_COINS") con("Недостаточно средств для покупки " + Entit.titles[canBuy] + "a", true);
                else con(e.message, true);
            }
        } else {
            tempDataUpdate["canSkip"] = true;
            tempDataUpdate["itemPrice"] = min;
            tempDataUpdate["itemName"] = canBuy;
        }
    }
    tempDataUpdate["onBrokenEvent"] = false;
}

vk.captchaHandler = async ({ src }, retry) => {
    if (!triedCaptcha)
        console.log('Для авторизации потребуется ввести код с картинки, которая откроется в вашем браузере.');
    try {
        open(src);
    } catch (e) {
        console.error('Ошибка при открытии капчи: ' + e);
    }
    if (triedCaptcha) {
        var consoleText = 'Введен неверный код! Попробуйте еще раз: ';
    } else {
        var consoleText = 'Введите код с картинки: ';
        triedCaptcha = true;
    }
    await rl.question(consoleText, async (code) => {
        try {
    	     await retry(code);
           } catch (e) {

           }
    });
};

vk.twoFactorHandler = async (payload, retry) => {
    console.log('На аккаунте включена двухфакторная авторизация! Вам был отправлен код в приложение VK или в виде СМС.');
    rl.question('Введите код: ', async (code) => {
        tried2FA = true;
        try {
    	       await retry(code);
           } catch (e) {

           }
    });
};


function updateLink() {
    if (!DONEURL || tforce) {
        if (!VK_TOKEN && !USERNAME && !PASSWORD) {
                con("Отсутствует токен. Информация о его получении расположена на -> github.com/Jeronyson/VCoinX", true);
                return process.exit();
        }
        (async function inVKProc(token) {
            if (!token && USERNAME && PASSWORD && backupTokens) {
                if (fs.existsSync('tokens/' + USERNAME + ".txt")){
                    let backupedToken = fs.readFileSync('tokens/' + USERNAME + ".txt");
                    tokenData = JSON.parse(backupedToken);
                    if (tokenData.token)
                        token = tokenData.token;
                }
            }
            if (!token && USERNAME && PASSWORD) {
                const { auth } = vk;
                vk.setOptions({
                       login: USERNAME,
                       password: PASSWORD
                });

                let direct;
                switch (authAppType) {
                    case "android":
                    default:
                        direct = auth.androidApp();
                        break;
                    case "iphone":
                        direct = auth.iphoneApp();
                        break;
                    case "ipad":
                        direct = auth.ipadApp();
                        break;
                    case "windows_phone":
                        direct = auth.windowsPhoneApp();
                        break;
                    case "windows":
                        direct = auth.windowsApp();
                        break;
                }

                response = await direct.run().catch((error) => {
                    switch (error.code) {
                        case 'PAGE_BLOCKED':
                            ccon("Страница пользователя заблокирована!", true, true, false);
                            break;
                        case 'AUTHORIZATION_FAILED':
                        case 'FAILED_PASSED_TWO_FACTOR':
                            if (tried2FA) {
                                ccon("Введен неправильный код двухфакторной авторизации!", true, true, false);
                            } else {
                                ccon("Указаны неправильный логин и/или пароль", true, true, false);
                            }
                            break;
                        case 'FAILED_PASSED_CAPTCHA':
                            ccon("Введен неправильный код с картинки!", true, true, false);
                            break;
                        default:
                            console.error('Ошибка авторизации: ' + e);
                            break;
                    }
                    process.exit();
	            });

                if (!response.token) {
                    ccon("Не удалось получить токен пользователя с помощью логина и пароля! Попробуйте указать токен вручную", true, true, false);
                    process.exit();
                }
                token = response.token;
                if (backupTokens) {
                    let backupJson = {
                        'id': response.user,
                        'token': token
                    };
                    if (!fs.existsSync('tokens')){
                        fs.mkdirSync('tokens');
                    }
                    fs.writeFile('tokens/' + USERNAME + '.txt', JSON.stringify(backupJson), (err) => {
                        if (err) throw err;
                        ccon('Токен пользователя успешно сохранен!');
                    });
                }
            }
            vk.token = token;
            try {
                if (!GROUP_ID) {
                    iframe_url = (await vk.api.apps.get({
                        app_id: 6915965,
                    })).items[0].mobile_iframe_url;
                } else {
                    response = (await vk.api.call('execute.resolveScreenName', {
                        screen_name: 'app6915965_-' + GROUP_ID,
                        owner_id: '-' + GROUP_ID,
                        func_v: 9
                    })).response.embedded_uri;
                    if (response.view_url)
                        iframe_url = response.view_url;
                    if (response.original_url && response.original_url == 'https://vk.com/coin')
                        throw ("Указан некорректный ID группы или группа не подключила майнинг VKCoin!");
                }
                if (!iframe_url)
                    throw ("Не удалось получить ссылку на приложение.\n\t\tВозможное решение: Используйте расширенный токен.");
                let id = (await vk.api.users.get())[0]["id"];
                if (!id)
                    throw ("Не удалось получить ID пользователя.");
                USER_ID = id;
                if (backupLinks) {
                    let backupJson = {
                        'id': id,
                        'token': token,
                        'link': iframe_url
                    };
                    if (!fs.existsSync('links')){
                        fs.mkdirSync('links');
                    }
                    fs.writeFile('links/id' + id + '.txt', JSON.stringify(backupJson), (err) => {
                        if (err) throw err;
                        ccon('Ссылка на iframe успешно сохранена!');
                    });
                }
                formatWSS(iframe_url);
                startBooster();
            } catch (error) {
                if (error.code && error.code == 5)
                    ccon('Указан некорректный токен пользователя! Перепроверьте токен или получите новый, как указано в данном руководстве -> github.com/Jeronyson/VCoinX', true, true, false);
                else if (error.code && (error.code == 'ECONNREFUSED' || error.code == 'ENOENT'))
                    ccon('Не удалось подключиться API! Попробуйте перезагрузить роутер или установить VPN.', true, true, false);
                else if (error.code && error.code == 3)
                    ccon('Указанный токен не подходит для майнинга на группу. Укажите расширенный токен или используйте автоматическое получение токена по логину и паролю, как указано в данном руководстве -> github.com/Jeronyson/VCoinX', true, true, false);
                else
                    console.error('API Error:', error);
                process.exit();
            }
        })(VK_TOKEN);
    } else {
        let GSEARCH = url.parse(DONEURL, true);
        if (!GSEARCH.query || !GSEARCH.query.vk_user_id) {
            con("При анализе ссылки не был найден айди пользователя.", true);
            return process.exit();
        }
        USER_ID = parseInt(GSEARCH.query.vk_user_id);
        formatWSS(DONEURL);
        startBooster();
    }
}
updateLink();

function formatWSS(LINK) {
    let GSEARCH = url.parse(LINK),
        NADDRWS = GSEARCH.protocol.replace("https:", "wss:").replace("http:", "ws:") + "//" + GSEARCH.host + "/channel/",
        CHANNEL = USER_ID % 32;
    URLWS = NADDRWS + CHANNEL + "/" + GSEARCH.search + "&ver=1&upd=1&pass=".concat(Entit.hashPassCoin(USER_ID, 0));
    currentServer = 0;
    switch (currentServer) {
        case 1:
            URLWS = URLWS.replace(/([\w-]+\.)*vkforms\.ru/, "bagosi-go-go.vkforms.ru");
            break;
        case 2:
            URLWS = URLWS.replace(/([\w-]+\.)*vkforms\.ru/, "coin.w5.vkforms.ru");
            break;
        default:
            URLWS = URLWS.replace(/([\w-]+\.)*vkforms\.ru/, "coin-without-bugs.vkforms.ru");
            break;
    }

    flog && console.log("formatWSS: ", URLWS);
    return URLWS;
}
