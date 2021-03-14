// ==UserScript==
// @author				bedo2991 @ Waze
// @name                WME Unlocker
// @description         Makes it easyer for the unlocker to handle the request
// @grant               none
// @run-at              document-start
// @updateURL	https://code.waze.tools/repository/7e74c74e-84d3-4b80-8f4c-fcb7f886b41d.user.js
// @include    /^https:\/\/(www|beta)\.waze\.com(\/\w{2,3}|\/\w{2,3}-\w{2,3}|\/\w{2,3}-\w{2,3}-\w{2,3})?\/editor\b/
// @version             1.2.2
// ==/UserScript==

    function ITUnlockerscript_global()
    {
        ITUnlockerVersion = GM_info.script.version;
        try{
    	UpdateObject = require("Waze/Action/UpdateObject");
        }
        catch(e)
        {
            console.error("API Error, cannot find UpdateObject action");
        }
    }
    function ITUnlockerscript_bootstrap() {
        var bGreasemonkeyServiceDefined = false;
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
                var dummyElem = document.createElement('p');
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
        var rtn = sourceURL.split("?")[0],
            param,
            params_arr = [],
            queryString = (sourceURL.indexOf("?") !== -1) ? sourceURL.split("?")[1] : "";
        if (queryString !== "") {
            params_arr = queryString.split("&");
            for (var i = params_arr.length - 1; i >= 0; i -= 1) {
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
        var max_lock = ITUnlockerGetRankLevel();
        if(W.loginManager.user.normalizedLevel < max_lock)
            return;

        if(max_lock == user_rank)
        {
        	message='I segmenti sono già sbloccati al livello richiesto.\nForse qualcun altro ha già effettuato questa richiesta?';
        }
        else
        {
            var lock_to = parseInt(user_rank) - 1;
            var si = W.selectionManager.getSelectedFeatures();
            var UpdateObject = require("Waze/Action/UpdateObject");
            console.log("Lock to: "+ lock_to);
            console.dir(UpdateObject);
            for(i =0; i < si.length && max_lock < 5; i++){
                s = si[i].model;
                W.model.actionManager.add(new UpdateObject(s, {lockRank:lock_to}));
            }
            $('div.toolbar-button.waze-icon-save')[0].addEventListener('click', ITUnlockerPermalink);
        }
    }

    function ITUnlockerGetRankLevel(){
    var sel = W.selectionManager.getSelectedFeatures();
        if(sel.length>0){
            var max = sel[0].model.getLockRank();
            for (i = 1; i < sel.length; i++) {
                if (max == 5)
                    return 6; //5+1
                if (sel[i].model.getLockRank() > max) {
                    max = rank;
                }
            }
            return max + 1;
        }
        return 8; //Higher than current user, abort initialization
    }

    function ITUnlockerGetMaxRANKLevel(){
    var sel = W.selectionManager.getSelectedFeatures();
        if(sel.length>0){
            var max = sel[0].model.attributes.rank;
            for (i = 1; i < sel.length; i++) {
                if (max == 5)
                    return 6; //5+1
                if (sel[i].model.attributes.rank > max) {
                    max = rank;
                }
            }
            return max + 1;
        }
        return 8; //Higher than current user, abort initialization
    }

    function ITUnlockerinsertButton() {
        consoleLog("Inserting button");
        if(document.getElementById('ITUnlocker') != undefined)
            return;

        var btn1 = $('<a id="ITUnlocker" href="javascript:;" style="margin-right:20px;float:left" title="Invia il PM precompilato al richiedente\nClick+CTRL: Non fatto\nClick+Shift: Ulteriori info\n WME Unlocker v. '+ITUnlockerVersion+'">Invia PM</a>');
        reporter = vars.R;
        modify =  vars.M == 't' ? true:false;
        user_rank = vars.U;
        if(user_rank != undefined)
        {
            if(!modify){
                consoleLog("Trying to update lock");
            	updateLock();
                consoleLog("Lock updated");
            }
            else
                consoleLog("Lock level won't be modified (WAD)");
        }
        else
            consoleLog("Error: User Rank is null");
        //Show the Message div
        var message_div=$('<div id="UNLmessage" class="ui-widget-content" style="overflow-y:auto; overflow-x:hidden; background-color:white; padding:10px; position:absolute; top:0; right:45%; display:inline-block; width:340pt; opacity:0.9; z-index:9999"></div>');
        if(typeof message == 'undefined'){ //no error message has been set
        message = decodeURIComponent(vars.Me);
        if(message != undefined)
        {
            var title = $('<h4 style="color:red; display:inline">Messaggio: </h4>');
            var message_p = $('<p style="display:inline">'+message.replace(/\n/g,"<br/>")+'</p>');
            var br = $('<br/>');
            var lock_level = $('<h4 style="color:red;display:inline">Richiesto da: </h4>');
            var user_r = $('<p style="display:inline">'+reporter + (user_rank != undefined?('('+user_rank+')</p>'):'</p>'));
            message_div.append(title).append(message_p).append(br).append(lock_level).append(user_r);
            if((rr=ITUnlockerGetMaxRANKLevel()) > user_rank)
            {
                var road_rank = $('<br/><p style="color:blue;display:inline">Attenzione! Il road rank di uno degli elementi ('+rr+') è maggiore del livello dell\'utente. Effettua la modifica modifica richiesta e blocca il segmento.</p>');
                message_div.append(road_rank);
            }
            if(modify){
                var edit_message = $('<h4 style="color:red;">Intervento richiesto, effettua la modifica e invia il PM usando il link.</h4>');
                message_div.append(edit_message);
            }
        }
        else{
            consoleLog('Message skipped');
        }
        }
        else
        {
            var warning = $('<h4 style="color:red; margin: auto">Avviso: '+message+'</h4>');
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
        if (vars.PM == "f")
        {
            btn1.text("PM non richiesto");
        }
        btn1.click(ITUnlockerPermalink);
        $(".WazeControlPermalink").prepend(btn1);
        consoleLog('ITUnlockerock initialised');
    }
    function getUrlVars() {
        var vars = {};
        var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
            vars[key] = value;
        });
        return vars;
    }
    function ITUnlockerPermalink(event) {
        $('div#UNLmessage').css('display','none');
        $('div.toolbar-button.waze-icon-save')[0].removeEventListener('click',ITUnlockerPermalink);
        if(event == undefined)
        {//Coming from save button
        	window.open(generateSuccessfulPMURL(reporter, original_permalink, message, modify));
        }
        if(event.ctrlKey)        //UNSUCESSFUL
        {
            window.open(generateUNSuccessfulPMURl(reporter,original_permalink, message), '_blank');
        }
        else if(event.shiftKey)
        {                        //More information
            window.open(generateInfoPMURL(reporter,original_permalink, message), '_blank');
        }
            else  //Successful:
        {
            window.open(generateSuccessfulPMURL(reporter, original_permalink, message, modify));
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
        "%20è%20stata%20esaudita%2C%20"+(modificare === true ? "modificando" : "sbloccando")+
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
        "%20non%20è%20stata%20esaudita."+
        "%0D%0AMotivazione:%0D%0A%0D%0A&icon=10";
    }

    function coolscript_init() {
        ITUnlockerscript_global();
        vars = getUrlVars();
        console.error(vars);
        if (vars.R == undefined)
        {
            consoleLog('No username, initialization aborted (WAD)');
            return;
        }
        consoleLog('init');
        ITUnlocker_WazeBits();
        //Inserisco il pulsante
        ITUnlockerinsertButton();
        save_original_permalink();
    }

window.onload = function() {
   ITUnlockerscript_bootstrap();
};
