// ==UserScript==
// @author				bedo2991 @ Waze
// @name                WME Unlocker
// @description         Makes it easyer for the unlocker to handle the request
// @grant               none
// @run-at              document-start
// @updateURL	        https://github.com/bedo2991/wme-unlocker/raw/main/unlocker.user.js
// @supportURL          https://github.com/bedo2991/wme-unlocker/issues
// @include             /^https:\/\/(www|beta)\.waze\.com(\/\w{2,3}|\/\w{2,3}-\w{2,3}|\/\w{2,3}-\w{2,3}-\w{2,3})?\/editor\b/
// @require             https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @version             1.5.0
// ==/UserScript==

/* global $, W, require, Components, WazeWrap*/


(function ITUnlocker() {
    const ITUnlockerVersion = GM_info.script.version;
    let UpdateObject = null;
    let ITUnlockerloginManager = null;
    let wazeModel = null;
    let message = null;
    let user_rank = null;
    let modify = null;
    let original_permalink = null;
    let pmRequested = false;
    let reporter = null;
    const vars = getUrlVars();

    const safeAlert = (level, message) => {
        try {
            WazeWrap.Alerts[level](GM_info.script.name, message);
        } catch (e) {
            console.error(e);
            alert(message);
        }
    };

    function ITUnlockerscript_global()
    {
        try{
            UpdateObject = require("Waze/Action/UpdateObject");
        }
        catch(e)
        {
            console.error("API Error, cannot find UpdateObject action");
        }
    }

    function ITUnlockerscript_bootstrap() {
        let bGreasemonkeyServiceDefined = false;
        try
        {
            if (typeof Components.interfaces.gmIGreasemonkeyService === "object")
            {
                bGreasemonkeyServiceDefined = true;
            }
        }
        catch (err) { //Ignore.
        }

        if (typeof unsafeWindow === "undefined" || !bGreasemonkeyServiceDefined)
        {
            unsafeWindow = (function() {
                const dummyElem = document.createElement('p');
                dummyElem.setAttribute('onclick', 'return window;');
                return dummyElem.onclick();
            })();
        }
        /* begin running the code! */
        coolscript_init();
    }

    function ITUnlocker_WazeBits() {
        ITUnlockerloginManager = unsafeWindow.W.loginManager;
        wazeModel = unsafeWindow.W.model;
        //$ = unsafeWindow.jQuery;
    }

    function removeParam(key, sourceURL) {
        let rtn = sourceURL.split("?")[0],
            param,
            params_arr = [],
            queryString = (sourceURL.indexOf("?") !== -1) ? sourceURL.split("?")[1] : "";
        if (queryString !== "") {
            params_arr = queryString.split("&");
            for (let i = params_arr.length - 1; i >= 0; i -= 1) {
                param = params_arr[i].split("=")[0];
                if (param === key) {
                    params_arr.splice(i, 1);
                }
            }
            rtn = rtn + "?" + params_arr.join("&");
        }
        return rtn;
    }

    function updateLock()
    {
        consoleLog("Update Lock");
        const si = W.selectionManager.getSelectedFeatures();
        if(si.length===0){
            message = 'Nessun segmento selezionato. O la richiesta ?? stata gi?? fatta, o quello che doveva essere selezionato non si trova qui.';
            return;
        }

        const max_lock = ITUnlockerGetRankLevel();
        if(W.loginManager.user.normalizedLevel < max_lock) {
            return;
        }

        if(max_lock === user_rank)
        {
            message = 'I segmenti sono gi?? sbloccati al livello richiesto.\nForse qualcun altro ha gi?? effettuato questa richiesta?';
            return;
        }
        else
        {
            const lock_to = parseInt(user_rank) - 1;
            console.log("Lock to: "+ lock_to);
            for(let i =0; i < si.length && max_lock < 5; i++){
                const s = si[i].model;
                W.model.actionManager.add(new UpdateObject(s, {lockRank:lock_to}));
            }
            $('div.toolbar-button.waze-icon-save')[0].addEventListener('click', ITUnlockerPermalink);
        }
    }

    function ITUnlockerGetRankLevel(){
        const sel = W.selectionManager.getSelectedFeatures();
        if(sel.length > 0){
            let max = sel[0].model.getLockRank();
            for (let i = 1; i < sel.length; i++) {
                if (max === 5) {
                    return 6; //5+1
                }
                const rank = sel[i].model.getLockRank();
                if (rank > max) {
                    max = rank;
                }
            }
            return max + 1;
        }
        return 8; //Higher than current user, abort initialization
    }

    function ITUnlockerGetMaxRANKLevel(){
        const sel = W.selectionManager.getSelectedFeatures();
        if(sel.length>0){
            let max = sel[0].model.attributes.rank;
            for (let i = 1; i < sel.length; i++) {
                if (max === 5) {
                    return 6; //5+1
                }
                const rank = sel[i].model.attributes.rank;
                if (rank > max) {
                    max = rank;
                }
            }
            return max + 1;
        }
        return 8; //Higher than current user, abort initialization
    }

    function ITUnlockerinsertButton() {
        consoleLog("Inserting button");
        if(document.getElementById('ITUnlocker') != undefined) {
            return;
        }

        const btn1 = $('<a id="ITUnlocker" href="javascript:;" style="margin-right:20px;float:left" title="Invia il PM precompilato al richiedente\nClick+CTRL: Non fatto\nClick+Shift: Ulteriori info\n WME Unlocker v. '+ITUnlockerVersion+'">Invia PM</a>');

        //Initialise global variables
        reporter = vars.R;
        modify = vars.M == 't' ? true:false;
        user_rank = vars.U;

        if(user_rank != undefined)
        {
            if(!modify) {
                consoleLog("Trying to update lock");
                updateLock();
                consoleLog("Lock updated");
            }
            else {
                consoleLog("Lock level won't be modified (WAD)");
            }
        }
        else {
            consoleLog("Error: User Rank is null");
        }

        //Show the Message div
        const message_div = $(`
       <div id="UNLmessage" class="ui-widget-content"
       style="overflow-y:auto; overflow-x:hidden; background-color:white; padding:5pt; position:absolute; top:10%; right:45%; display:inline-block; width:340pt; opacity:0.9; z-index:9999">
       </div>`);
        const close_button = $('<button id="it-unlocker-close" style="float:right; border-radius: 50%; width:15pt; height: 15pt; font-weight:bold; line-height: 7.5pt; padding:0;">x</button>');
        close_button.on("click", cleanUp);
        message_div.append(close_button);
        if(!message){ //no error message has been set until now
            //Get the message from the URL parameters
            message = decodeURIComponent(vars.Me);
            if(message)
            {
                const title = $('<h5 style="color:red; display:inline">Messaggio: </h5>');
                const message_p = $('<p style="display:inline">'+message.replace(/\n/g,"<br/>")+'</p>');
                const br = $('<br/>');
                const lock_level = $('<h5 style="color:red;display:inline">Richiesto da: </h5>');
                const user_r = $('<p style="display:inline">'+reporter + (user_rank != undefined?('('+user_rank+')</p>'):'</p>'));
                message_div.append(title).append(message_p).append(br).append(lock_level).append(user_r);
                const rr = ITUnlockerGetMaxRANKLevel();
                if(rr > user_rank)
                {
                    const road_rank = $('<br/><p style="color:blue;display:inline">Attenzione! Il road rank di uno degli elementi ('+rr+') ?? maggiore del livello dell\'utente. Effettua la modifica modifica richiesta e blocca il segmento.</p>');
                    message_div.append(road_rank);
                }
                if(modify){
                    const edit_message = $(`<h5 style="color:red;">Intervento richiesto, effettua tu la modifica${pmRequested? 'e invia il PM usando il link':' - PM non richiesto'}.</h5>`);
                    message_div.append(edit_message);
                }
            }
            else{
                consoleLog('Message skipped');
            }
        }
        else
        {
            const warning = $(`<h5 style="color:red; margin: auto">Avviso: ${message}</h5>`);
            message_div.append(warning);
        }
        //Insert the message in the page
        $('body').append(message_div);
        try{
            $( "#UNLmessage" ).draggable();
        }
        catch(e)
        {
            consoleLog("Unlocker: Draggable is not available");
            $( "#UNLmessage" ).show();
        }
        consoleLog('Message inserted');
        if (vars.PM === "f")
        {
            btn1.text("PM non richiesto");
        }else{
            pmRequested = true; //false by default
        }
        btn1.click(ITUnlockerPermalink);
        $(".WazeControlPermalink").prepend(btn1);
        consoleLog('ITUnlockerock initialised');
    }

    function getUrlVars() {
        const vars = {};
        window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, key, value) {
            vars[key] = value;
        });
        return vars;
    }

    function cleanUp(){
        //Remove the panel
        $('#UNLmessage').remove();
        //Remove the "Invia PM" button
        $('#ITUnlocker').remove();
        //Remove the event listener from the save button
        $('div.toolbar-button.waze-icon-save')[0].removeEventListener('click',ITUnlockerPermalink);
        //Update the page URL
        history.pushState({}, null, original_permalink);
    }

    function ITUnlockerPermalink(event) {
        cleanUp();
        if(event.ctrlKey)
        { //UNSUCESSFUL
            window.open(generateUNSuccessfulPMURl(reporter,original_permalink, message), '_blank');
        }
        else if(event.shiftKey)
        { //More information
            window.open(generateInfoPMURL(reporter,original_permalink, message), '_blank');
        }
        else //Successful:
        {
            if(pmRequested){
                window.open(generateSuccessfulPMURL(reporter, original_permalink, message, modify));
            }else{
                safeAlert("success", `That's all, ${reporter} does not want to receive a PM`);
            }
        }
        return false;
    }

    function consoleLog(text) {
        console.log('ITUnlocker v. ' + ITUnlockerVersion + ': ' + text);
    }

    function save_original_permalink()
    {
        original_permalink = generate_permalink();
        //Clean the permalink
        original_permalink = removeParam('R', original_permalink);
        original_permalink = removeParam('PM', original_permalink);
        original_permalink = removeParam('Me', original_permalink);
        original_permalink = removeParam('M', original_permalink);
        original_permalink = removeParam('U', original_permalink);
        consoleLog(original_permalink);
    }
    function generate_permalink() {
        return $('a.permalink')[0].href;
    }

    function generateSuccessfulPMURL(username, permalink, messaggio, modificare)
    {
        return "http://www.waze.com/forum/ucp.php?i=pm&mode=compose&username="+
            username+
            "&subject=Richiesta%20esaudita&message=La%20richiesta%20con%20messaggio%0D%0A%22"+
            encodeURI(messaggio)+
            "%22%0D%0Ae%20permalink%20"+
            permalink.replace(/&/g, "%26").replace(/#/g, "%23")+
            "%20??%20stata%20esaudita%2C%20"+(modificare === true ? "modificando" : "sbloccando")+
            "%20come%20richiesto.%0D%0A%0D%0ASi%20prega%20di%20non%20rispondere%20se%20non%20strettamente%20necessario.%0D%0A%0D%0ABuon%20lavoro!%0D%0A&icon=8";
    }

    function generateInfoPMURL(username, permalink, messaggio)
    {
        return "http://www.waze.com/forum/ucp.php?i=pm&mode=compose&username="+
            username+
            "&subject=Ulteriori%20informazioni%20necessarie&message=Circa%20la%20richiesta%20con%20messaggio%0D%0A%22"+
            encodeURI(messaggio)+
            "%22%0D%0Ae%20permalink%20"+
            permalink.replace(/&/g, "%26").replace(/#/g, "%23")+
            "%0D%0Aabbiamo%20bisogno%20di%20ulteriori%20informazioni%20da%20parte%20tua."+
            "%0D%0A%0D%0A%0D%0AGrazie.&icon=9";
    }

    function generateUNSuccessfulPMURl(username, permalink, messaggio)
    {
        return "http://www.waze.com/forum/ucp.php?i=pm&mode=compose&username="+
            username+
            "&subject=Richiesta%20NON%20esaudita&message=La%20richiesta%20con%20messaggio%0D%0A%22"+
            encodeURI(messaggio)+
            "%22%0D%0Ae%20permalink%20"+
            permalink.replace(/&/g, "%26").replace(/#/g, "%23")+
            "%20non%20??%20stata%20esaudita."+
            "%0D%0AMotivazione:%0D%0A%0D%0A&icon=10";
    }

    function showUpdateWindow(trials = 0){
        if(WazeWrap && WazeWrap.Ready){
            WazeWrap.Interface.ShowScriptUpdate(
                'WME Unlocker',
                ITUnlockerVersion,
                `<b>Novit??</b>
                <br>- 1.5.0 Quando il PM non ?? richiesto, il messaggio lo dice ora esplicitamente.`,
                '',
                GM_info.script.supportURL
            );
        }else if(trials < 10){
            setTimeout((trials)=>{showUpdateWindow(trials++);}, 1000);
        }
    }

    function coolscript_init() {
        console.debug(vars);
        showUpdateWindow();
        if (vars.R == undefined)
        {
            consoleLog('No username, initialization aborted (WAD)');
            return;
        }
        consoleLog('init');
        ITUnlockerscript_global();
        ITUnlocker_WazeBits();
        //Inserisco il pulsante
        ITUnlockerinsertButton();
        save_original_permalink();
    }

    window.onload = function() {
        ITUnlockerscript_bootstrap();
    };

})();
