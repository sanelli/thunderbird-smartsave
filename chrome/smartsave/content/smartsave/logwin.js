function init(){

	document.getElementById("smartsave_reportarea").value = window.arguments[0];

}

function save(){
	var txt = document.getElementById("smartsave_reportarea").value;

	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
	fp.init(window,"Save",fp.modeSave);

	if(fp.show() != fp.returnCancel){
		var outFile = fp.file;

		//var outFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		outFile.QueryInterface(Components.interfaces.nsIFile);	// Mi serve per poter eliminare/creare il file!
	    //outFile.initWithPath(file.unicodePath);  // Praticamente questo metodo mi finge da secondo costruttore

		try{
			outFile.create(outFile.NORMAL_FILE_TYPE, 0666);	// Se necessario lo creo con permessi RWX stile Unix per tutti !!
		}catch(e){}

	    var fileOutputStream = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
		fileOutputStream.init(outFile, 2, 0x200, false); 
		fileOutputStream.write(txt, txt.length);
		fileOutputStream.close();

	}


}