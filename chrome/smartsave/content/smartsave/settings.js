/*
 * CODICE PER LA GESTIONE DELLE IMPOSTAZIONI
 *
 */


/*
 * Inizializzazione dei valori predefiniti di default
 *
 */
 function init(){

	initPrefs();
	endis_keepstruct();
	enableFormat();
	enablePath();

 }

 /*
 * Funzione per il salvataggio delle impostazioni
 *
 */
function savePref(){

	var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

	try{
		pref.setCharPref("smartsave.prefs.basefolder.ask",document.getElementById("smartsave_export_basefolder").selectedItem.id);			
	}catch(e){}

	try{
		var dir = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		dir.QueryInterface(Components.interfaces.nsIFile);	// Mi serve per poter creare la cartella
		dir.initWithPath(document.getElementById("optionExport_basefolder").value);  

		if(!dir.exists()){
			alert(getString("smartsave.message.wrongfolder"));
			return false;
		}else
			pref.setCharPref("smartsave.prefs.basefolder",document.getElementById("optionExport_basefolder").value);
	}catch(e){}

	try{
		pref.setCharPref("smartsave.prefs.extension",document.getElementById("optionExport_extension").value);
	}catch(e){}

	try{
		pref.setBoolPref("smartsave.prefs.recurse",document.getElementById("optionExport_recurse").checked);
	}catch(e){}

	try{
		pref.setBoolPref("smartsave.prefs.keepstruct",document.getElementById("optionExport_keepstruct").checked);
	}catch(e){}

	try{
		pref.setBoolPref("smartsave.prefs.overwrite",document.getElementById("optionExport_overwrite").checked);
	}catch(e){}

	try{
		pref.setCharPref("smartsave.prefs.format",document.getElementById("smartsave_export_format").selectedItem.id);
	}catch(e){}

	try{
		pref.setCharPref("smartsave.prefs.strFormat",document.getElementById("optionExport_personal").value);
	}catch(e){}

	try{
		pref.setBoolPref("smartsave.prefs.beep",document.getElementById("optionExport_Beep").checked);
	}catch(e){}

	try{
		pref.setBoolPref("smartsave.prefs.alert",document.getElementById("optionExport_Alert").checked);
	}catch(e){}


	return true;

}

/*
 * Funzione che inizializza le preferenze generali dell'utente
 *
 */
function initPrefs(){
	var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

	try{
		var basefolder = pref.getCharPref("smartsave.prefs.basefolder");
		document.getElementById("optionExport_basefolder").value = basefolder;
	}catch(e){
		document.getElementById("optionExport_basefolder").value = getUserHome();
	}
	document.getElementById("optionExport_basefolder").disabled = true;
	document.getElementById("optionExport_basefolder_browse").disabled = true;

	try{
		var extension = pref.getCharPref("smartsave.prefs.extension");
		document.getElementById("optionExport_extension").value = extension;
	}catch(e){
		document.getElementById("optionExport_extension").value = ".eml";
	}

	try{
		var recurse = pref.getBoolPref("smartsave.prefs.recurse");
		document.getElementById("optionExport_recurse").checked = recurse;
	}catch(e){
		document.getElementById("optionExport_recurse").checked = true;
	}

	try{
		var keepstruct = pref.getBoolPref("smartsave.prefs.keepstruct");
		document.getElementById("optionExport_keepstruct").checked = keepstruct;
	}catch(e){
		document.getElementById("optionExport_keepstruct").checked = true;
	}

	try{
		var overwrite = pref.getBoolPref("smartsave.prefs.overwrite");
		document.getElementById("optionExport_overwrite").checked = overwrite;
	}catch(e){
		document.getElementById("optionExport_overwrite").checked = false;
	}

	try{
		var strFormat = pref.getCharPref("smartsave.prefs.strFormat");
		document.getElementById("optionExport_personal").value = strFormat;
	}catch(e){
		document.getElementById("optionExport_personal").value = "[SUBJECT]_[SENDER]_[YEAR]_[MONTH]_[DAY]_[HOUR]_[MIN]_[SEC]";
	}
	document.getElementById("optionExport_personal").disabled = true;
	document.getElementById("optionExport_helpButton").disabled = true;


	try{
		var format = pref.getCharPref("smartsave.prefs.format");
		document.getElementById("smartsave_export_format").selectedItem = document.getElementById(format);
	}catch(e){
		document.getElementById("smartsave_export_format").selectedItem = document.getElementById("optionExport_default");
	}

	try{
		var what = pref.getCharPref("smartsave.prefs.basefolder.ask");
		document.getElementById("smartsave_export_basefolder").selectedItem = document.getElementById(what);
	}catch(e){
		document.getElementById("smartsave_export_basefolder").selectedItem = document.getElementById("optionExport_askpath");
	}

	try{
		var beep = pref.getBoolPref("smartsave.prefs.beep");
		document.getElementById("optionExport_Beep").checked = beep;
	}catch(e){
		document.getElementById("optionExport_Beep").checked = false;
	}

	try{
		var beep = pref.getBoolPref("smartsave.prefs.alert");
		document.getElementById("optionExport_Alert").checked = beep;
	}catch(e){
		document.getElementById("optionExport_Alert").checked = true;
	}


 }

/*
 * Abilito a disabilito il campo di testo per inserire il formato del nome file personalizzato
 *
 */
function enableFormat(){

	var optThree = document.getElementById("optionExport_three");
	var optText = document.getElementById("optionExport_personal");
	var helpBtn = document.getElementById("optionExport_helpButton");

	if(optThree.selected){
		optText.disabled = false;
		helpBtn.disabled = false;
	} else {
		optText.disabled = true;
		helpBtn.disabled = true;
	}
}


/*
 * Funzione che abilita/ disabilita il browser
 *
 */
function enablePath(){

	var radioBtn = document.getElementById("optionExport_dontaskpath");
	var browseBtn = document.getElementById("optionExport_basefolder_browse");
	var textFld = document.getElementById("optionExport_basefolder");

	browseBtn.disabled = !radioBtn.selected;
	textFld.disabled = !radioBtn.selected;

}

/*
 * Seleziona la cartella base dove mettere tutti file
 *
 */
 function selectBasefolder(){
 
	var Cc = Components.classes;
	var Ci = Components.interfaces;
	var fp;

	fp = Cc["@mozilla.org/filepicker;1"];
	fp = fp.createInstance(Ci.nsIFilePicker);
	fp.init(window,getString("smartsave.message.selectafolder"),fp.modeGetFolder);
	var basefolderFile = null;

	try{
		var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
		basefolderFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		basefolderFile.initWithPath(pref.getCharPref("smartsave.prefs.basefolder"));
	}catch(e){}

	try{
		if(basefolderFile && basefolderFile.exists())
			fp.displayDirectory = basefolderFile;
	}catch(e){}

	if(fp.show() != fp.returnCancel){

		var folderTxt = document.getElementById("optionExport_basefolder");
		var txt = fp.fileURL.file.path;
		folderTxt.value = txt;

	}
 
 }


/*
 * Richiama la funzione che mostra il popup di aiuto
 *
 */
function showHelpPopup(){
	
	var popup = document.getElementById("optionExport_helpmenu");
	var button = document.getElementById("optionExport_helpButton");
	popup.showPopup(button,-1,-1,"popup","bottomleft","topleft");

}

/*
 * Inserisce what come stringa all'interno delle impostazioni di formato personali
 *
 */
function helpInsert(what){

	var txtField = document.getElementById("optionExport_personal");

	var start = txtField.selectionStart;
	var end = txtField.selectionEnd;

	txtField.value = txtField.value.substring(0,start)+what+txtField.value.substring(end,txtField.value.length);
}

/*
 * Funzione utilizzata creare la localizzaione nei file JavaScript
 *
 */
function getString(ident){

	var strService = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
	var bundle = strService.createBundle("chrome://smartsave/locale/messages.properties");
	return bundle.GetStringFromName(ident);

}

/*
 * Funzione che abilita/disabilita 
 *
 */
 function endis_keepstruct(){

	var rec = document.getElementById("optionExport_recurse").checked;
    document.getElementById("optionExport_keepstruct").disabled = !rec; 

 }

/*
 * Funzione che ritorna la home dell'utente
 */
 function getUserHome(){
 
  result = {}
  var prov = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIDirectoryServiceProvider);
  return prov.getFile("Home",result).path;
}