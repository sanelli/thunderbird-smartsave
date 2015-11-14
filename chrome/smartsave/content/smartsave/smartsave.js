
// Var that hold the final report
var report = "";

// Counter for messages and folder in IMAP
var c_folder = 0;
var c_msg = 0;

// Cpunter for exported messages
var tot_msg = 0;

// Used with open... don't touch
var openOption = true;


//////////////////////////////////////////////////////////////////////////
//					SINGLE MAIL FUNCTION								//
//////////////////////////////////////////////////////////////////////////


 /*
  * Export, if exists the selected mail
  *
  */
function exportSelectedMail(){
	try{
		var dbv = GetDBView();	// Ottendo la vista attuale della finestra che mi serve per ottenere i messaggi
		var messageArray = {}
		var length = {}
		var msgArray = dbv.getURIsForSelection(messageArray,length);	// Ottengo gli uri dei messaggi selezionati

		if(length.value == 0){
			return null;
		}

		msgArray = messageArray.value;	// In questo array ho effettivamente gli URI degli elementi selezionati		
		
	}catch(ge){}

	report = getString("smartsave.message.report8")+"\n";
	tot_msg = 0;

	// Carico le preferenze
	var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

	// Dovendo esportare delle e-mail singole chiedo dove vuole esportarle (mostrando come prima cosa la directory base!)
	// Per esportare le singole e-mail ho preferito chiedere ogni volta il percorso e non utilizzare un percorso
	// predefinito, per farlo uso il FilePicker, oggetto predefinito di Mozilla
	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
	fp.init(window,getString("smartsave.message.selectafolder"),fp.modeGetFolder);

	var basefolderFile = null; // carico qui il basefolder preferenziale
	try{
		basefolderFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		basefolderFile.initWithPath(pref.getCharPref("smartsave.prefs.basefolder"));
	}catch(e){	
	    basefolderFile.initWithPath(getUserHome().path);
	}

	try{	// Controllo se esiste e lo assegno al filepicker come cartella da visualizzare
		if(basefolderFile && basefolderFile.exists())
			fp.displayDirectory = basefolderFile;
	}catch(e){
		//alert("ERRORE!!");
	}	


	// Mostro la finestra
	if(fp.show() != fp.returnCancel){	// Se non esco o faccio cancel esport effetivamente le cartelle
		var basefolder = fp.fileURL.file.path;

		report += getString("smartsave.message.report2")+": \""+basefolder+"\"\n";
		report += "\n["+getString("smartsave.message.report5")+"]\n"


		// Adesso salvo singolarmente tutti le e-mail nei file
		for(var i=0; i<msgArray.length; i++){
			saveMsg(basefolder,msgArray[i]);
		}

		//report += "["+getString("smartsave.message.report6")+"]\n"


		// Mostro un messaggio di avviso se necessario
		alertEnd("smartsave.message.exportedmaildoneok","smartsave.message.finishdialog");

	} // Fine if se ho accettao la cartella

}

 /*
  * This function export a single message
  * - folder : Destination path
  * - uri: Usi message
  *
  */
  function saveMsg(folder,uri){

	var header = messenger.messageServiceFromURI(uri).messageURIToMsgHdr(uri);	// Carico l'intestazione del messaggio

	var filename = generateFileName(header);	// Adesso ho un filename corretto!!

	var str = getString("smartsave.message.report9").replace(/\[URI\]/g,'"'+uri+'"').replace(/\[FILENAME\]/g,'"'+filename+'"');
	report += "\t"+str+"\n";

	filename = 	folder+getFileSeparator()+filename;	// Adesso ho il nome del file completo di percorso!

	var file = Components.classes["@mozilla.org/filespec;1"].createInstance(Components.interfaces.nsIFileSpec);
	file.unicodePath = filename;
	

	// Imposto gli stream e le interfacce di lettura dei file
	// Il file da leggere è quello che mi è stato passato come parametro uri
	// Per farlo uso gli oggetti local file, input stream e scriptable input stream.
	var inFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
	inFile.initWithPath(header.folder.path.nativePath);
    var fileInputStream =  Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
	fileInputStream.init( inFile, 0x01, 0444, null ); // Apro il messaggio in lettura
    fileInputStream.QueryInterface(Components.interfaces.nsISeekableStream);	// Devo fare il seek perchè lui ha tutto in un unico file!!!
    fileInputStream.seek(0,header.messageOffset);
    var fileScriptableIO = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
    fileScriptableIO.init(fileInputStream);
    var fileContent = fileScriptableIO.read( header.messageSize ); // Ottengo per intero tutto il contentuo della mail che
																   // è parte del file
	fileScriptableIO.close();	// Chiuto tutti gli stream aperti!
	fileInputStream.close();

	// Imposto la scrittura dei file
	var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	var overwrite = false;	// Definisco se eventualmente sovrascrivere il file
	try{	// Prendendolo delle preferenze dell'utente
		overwrite = pref.getBoolPref("smartsave.prefs.overwrite");
	}catch(e){
		overwrite = false;
	}

	// Inizializzo gli oggetti necessari per la scrittura.
	// file mi serve per definire i para,etri di un file (nome, ecc...)
	// outFile mi serve invece come oggetto per controllare l'esistenza fisica in locale del file
	var outFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
	outFile.QueryInterface(Components.interfaces.nsIFile);	// Mi serve per poter eliminare/creare il file!
	try{
	    outFile.initWithPath(file.unicodePath);  // Praticamente questo metodo mi finge da secondo costruttore
	}catch(e){
		report += "\t"+getString("smartsave.message.report15").replace(/\[FILENAME\]/g,file.unicodePath)+"\n";
		tot_msg--;
	}
	
	if(header.folder.server.type == 'imap'){
		
		if((outFile.exists() && overwrite) || !outFile.exists()){
		
				if(outFile.exists()) {
					try{
						report += "\t"+getString("smartsave.message.report10").replace(/\[FILENAME\]/g,'"'+filename+'"')+"\n";
						outFile.remove(false);	
					}catch(e){}
				}	
		
				saveIMAPMessage(header, file, uri)
				tot_msg++;
		
			}else{
				var str = getString("smartsave.message.report13").replace(/\[FILENAME\]/g,'"'+filename+'"');
				report +="\t"+str+"\n";
				c_msg--;
			}		
		
		return;
	}	

	// Scrivo sul file sul file solo se o il file non esiste oppure se esiste ma lo voglio sovrascrivere
	if((outFile.exists() && overwrite) || !outFile.exists()){

		if(outFile.exists()) {
			try{
				report += "\t"+getString("smartsave.message.report10").replace(/\[FILENAME\]/g,'"'+filename+'"')+"\n";
				outFile.remove(false);	
			}catch(e){}
		}	

		// Apro lo stream di scrittura sul file
	    var fileOutputStream = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
		try{
			outFile.create(outFile.NORMAL_FILE_TYPE, 0666);	// Se necessario lo creo con permessi RWX stile Unix per tutti !!
		}catch(e){}
	
		fileOutputStream.init(outFile, 2, 0x200, false); // Lo apro in sola scrittura

		fileOutputStream.write(fileContent, fileContent.length);
		fileOutputStream.close();
		tot_msg++;

	}else{
		var str = getString("smartsave.message.report13").replace(/\[FILENAME\]/g,'"'+filename+'"');
		report +="\t"+str+"\n";
	}

  }


/*
 * Save an IMAP Message
 * - header: Message header
 * - file: And nsIFileSpec object
 * - uri: Message uri
 */
function saveIMAPMessage(header, file, uri){

	var mms = messenger.messageServiceFromURI(uri).QueryInterface(Components.interfaces.nsIMsgMessageService);
	var listener = myStreamListener();
	listener.file = file;
	listener.callback = realWriteIMAPMessage;
	var duri = new Object();
	mms.DisplayMessage(uri, listener, null, null, null, duri);

}


/*
 * Save IMAP Messages on Disk
 *
 */
function realWriteIMAPMessage(fileContent, file){

	var sfile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
	try{
	    sfile.initWithPath(file.unicodePath);  
	}catch(e){
		report += "\t"+getString("smartsave.message.report15").replace(/\[FILENAME\]/g,file.unicodePath)+"\n";
		tot_msg--;
	}
	sfile.QueryInterface(Components.interfaces.nsIFile);
    var stream = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
    
	// Imposto la scrittura dei file
	var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	var overwrite = false;	// Definisco se eventualmente sovrascrivere il file
	try{	// Prendendolo delle preferenze dell'utente
		overwrite = pref.getBoolPref("smartsave.prefs.overwrite");
	}catch(e){
		overwrite = false;
	}


	if((sfile.exists() && overwrite) || !sfile.exists()){

		if(sfile.exists()) {
			try{
				report += "\t"+getString("smartsave.message.report10").replace(/\[FILENAME\]/g,filename)+"\n";
				sfile.remove(false);	
			}catch(e){}
		}

		try{
			sfile.create(sfile.NORMAL_FILE_TYPE, 0666);
		}catch(e){
		}

		stream.init(sfile, 2, 0x200, false); // open as "write only"

		stream.write(fileContent, fileContent.length);
		stream.close();

		report +="\t"+getString("smartsave.message.report11").replace(/\[FILENAME\]/g,file.unicodePath)+"\n";

	}

	c_msg--;

}


/*
 * Stream Listener Class for IMAP Folder
 *
 */ 

 function myStreamListener(){
 
	var streamListener = {
	        mStream : null,
            src: '',
            QueryInterface : function(iid)  {
                if (iid.equals(Components.interfaces.nsIStreamListener) ||
                    iid.equals(Components.interfaces.nsIMsgHeaderSink) ||
                    iid.equals(Components.interfaces.nsISupports))
                 return this;
        
                throw Components.results.NS_NOINTERFACE;

                return 0;
            },

            onStartRequest : function (aRequest, aContext) {
                this.mStream = Components.classes['@mozilla.org/binaryinputstream;1'].createInstance(Components.interfaces.nsIBinaryInputStream);
                var channel = aRequest.QueryInterface(Components.interfaces.nsIChannel);
                channel.URI.QueryInterface(Components.interfaces.nsIMsgMailNewsUrl);
                channel.URI.msgHeaderSink = this
            },

            
            onStopRequest : function (aRequest, aContext, aStatusCode) {

                this.mStream = null;
				realWriteIMAPMessage(this.src, this.file)
            },
            
            onDataAvailable : function (aRequest, aContext, aInputStream, aOffset, aCount) {
                this.mStream.setInputStream(aInputStream);
                var chunk = this.mStream.readBytes(aCount);
                this.src += chunk;				
            },
            
            onStartHeaders: function() {
            },
        
            onEndHeaders: function() {
            },
        
            processHeaders: function(headerNameEnumerator, headerValueEnumerator, dontCollectAddress) {
            },
        
            handleAttachment: function(contentType, url, displayName, uri, isExternalAttachment) {
            },
            
            onEndAllAttachments: function() {
            },
        
            onEndMsgDownload: function(url) {
            },
        
            onEndMsgHeaders: function(url) { 
            },
        
            onMsgHasRemoteContent: function(aMsgHdr) {
            },
        
            getSecurityInfo: function() {
            },
            
            setSecurityInfo: function(aSecurityInfo) {
            },
        
            getDummyMsgHeader: function() {
            }
	}
	return streamListener;
 
 }


//////////////////////////////////////////////////////////////////////////
//					FOLDER FUNCTIONS									//
//////////////////////////////////////////////////////////////////////////

/*
 * Export, if exists, the local folder
 *
 */
 function exportSelectedFolder(){
	
	// Determino l'uri e il nodo da esportare del folder da esportare
	var folder = null;
	try{
	
		var folderTree = GetFolderTree();
	    var selection = folderTree.view.selection;	
		var startIndex = {};
        var endIndex = {};
        selection.getRangeAt(0, startIndex, endIndex);
        folder = GetFolderResource(folderTree, startIndex.value);	    
	
		//var dbv = GetDBView();	// Ottengo la vista dell'albero attuale...
		//folder = dbv.msgFolder;	// Ottengo il folder selezionato!
								// A differenza delle e-mail è possibile selezioare solo un folder per volta
								// Quindi questo metodo ritorna un folder e non array di folder!!
	
	}catch(ge){
		alert(getString("smartsave.message.cantexportfolder"));
	}

	if(folder == null)
		return;

	report = getString("smartsave.message.report1")+" \""+folder.name+"\".\n";
	tot_msg = 0;

	var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

	// Carico le preferenze

	var askdir = null;
	var basefolder = null;
	var accept = true;	// Va a false quando, selezionato il percorso, l'utente preme il tasto cancel

	try{ // Devo chiedere il percorso ogni volta ??
		askdir = pref.getCharPref("smartsave.prefs.basefolder.ask");
	}catch(e){
		askdir = "optionExport_askpath";
	}

	if(askdir=="optionExport_askpath"){	// Se devo chiedere il percoso...
	
			// Apro il filepicker
			var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
			fp.init(window,getString("smartsave.message.selectafolder"),fp.modeGetFolder);

			var basefolderFile = null; // carico qui il basefolder preferenziale
			try{
				basefolderFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
				basefolderFile.initWithPath(pref.getCharPref("smartsave.prefs.basefolder"));
			}catch(e){			
				basefolderFile.initWithPath(getUserHome().path);
			}

			try{	// Controllo se esiste e lo assegno al filepicker come cartella da visualizzare
				if(basefolderFile && basefolderFile.exists())
					fp.displayDirectory = basefolderFile;
			}catch(e){}	


			// Mostro la finestra
			if(fp.show() != fp.returnCancel){
				basefolder = fp.fileURL.file.path;
			}else{
				accept = false;
			}

	} else {	// Se non lo devo chiedere...

		try{
			basefolder = pref.getCharPref("smartsave.prefs.basefolder");
		}catch(e){
			basefolder = ".";
		}

	}

	if(!accept)	// Se prima ho cliccato su cancel esco dalla procedura!
		return null;

	// Carico il resto delle preferenze!
	var recurse = true;
	try{
		recurse = pref.getBoolPref("smartsave.prefs.recurse");
	}catch(e){
		recurse= true;
	}

	var keepstruct = true;
	try{
		keepstruct = pref.getBoolPref("smartsave.prefs.keepstruct");
	}catch(e){
		keepstruct = true;
	}

	report += getString("smartsave.message.report2")+": \""+basefolder+"\".\n";
	report += getString("smartsave.message.report3")+": "+recurse+".\n";
	report += getString("smartsave.message.report4")+": "+keepstruct+".\n";

	report += "\n["+getString("smartsave.message.report5")+"]\n"


	// Lancio la funzione eventualemnte ricorsiva per esportare 
	// tutti i messaggi e tutte le cartelle presenti in folder
	c_folder = 1 + countSubfolder(folder);
	exportFolder(folder,basefolder,recurse,keepstruct);

	//report += "\n["+getString("smartsave.message.report6")+"]\n"

	if(folder.server.type != 'imap')
		alertEnd("smartsave.message.exportedfolderdoneok","smartsave.message.finishdialog");
	else
		checkIMAPEnd();	
 }

/*
 * Check every 500ms if IMAP process has ended
 *
 */
function checkIMAPEnd(){
	if((c_folder>0) || (c_msg>0))
		setTimeout("checkIMAPEnd();",500);
	else
		alertEnd("smartsave.message.exportedfolderdoneok","smartsave.message.finishdialog");
}

/*
 * Count the number of subfolder
 *
 */
function countSubfolder(folder){

	if(!folder.hasSubFolders){
		return 0;
	} else {

		var subs = folder.GetSubFolders();	// Ottengo quello un enumerazione
		var result = 0;
		subs.first();	// Mi muovo sul primo elemento

		try{
			do{
				var item = subs.currentItem();	// Ottengo l'oggetto corrente dell'iterazione
				item.QueryInterface(Components.interfaces.nsIMsgFolder);	// In modo da poter utilizzare item come nsIMsgFolder

				result++;	// Conto questa sottocartella
				result += countSubfolder(item); // Conto le sottocartelle di item

				subs.next();	// Passo al prossimo oggetto
			}while(true);
		}catch(e){}

		return result;
	}
}


 /*
  * This function export ricursivley the folder
  *
  * PARAMETRI:
  *		- fol: An nsIMsgFolder object
  *		- exportfolder: Path where export messages
  *		- recurse:	used to set if look in subfolder
  *		- keepstruct: Set the correct export path if you wanna keep the struct
  */
 function exportFolder(fol, exportfolder, recurse, keepstruct){
	var uri = fol.baseMessageURI; // L'uri del folder, Esempio: message-folder://nobody@Local%20Folders/Inbox
	var name = fol.name;	// Nome della cartella, Esempio: Inbox

	if(keepstruct)	// Costruisco eventualemnte il nuovo percorso per le email
		exportfolder = exportfolder+getFileSeparator()+fol.name;


	var str = getString("smartsave.message.report7").replace(/\[FOLDERNAME\]/g,'"'+name+'"');
	str = str.replace(/\[DIRECTORY\]/g,'"'+exportfolder+'"');

	report += "\t"+str+"\n";	

	//Creo la cartella se necessario
	createDir(exportfolder);

	// Esporto i messaggi di questo folder
	try{	// Devo aggiungere questo try per quando teno di esportare i messaggi in LocalFolders... che ovviamente non esistono!
			// In local folder sono presenti solo cartelle !!
		
		if(fol.server.type == 'imap'){ // MESSAGGI SU SERVER IMAP

			fol.clearNewMessages();

			setStatusBar(getString("smartsave.message.downloadingmsg"));
			// Scarico tutti messaggi dal server !!

			listener = myUrlListener();
			listener.fol = fol;
			listener.exportfolder = exportfolder;
			listener.uri = uri;

			fol.downloadAllForOffline(listener, msgWindow);			

		
		} else {	// MESSAGGI IN LOCLAE

			setStatusBar(getString("smartsave.message.exportingmsg"));
			/* START CHANGES IN VERSION 0.1.5 */
			var db = fol.getMsgDatabase(msgWindow);
			var threads = fol.getMessages(msgWindow);
			while(threads.hasMoreElements()){
				var threadHdr = threads.getNext();
				threadHdr.QueryInterface(Components.interfaces.nsIMsgDBHdr);
				try{					var idThread = threadHdr.threadId;
					var thread = db.GetThreadContainingMsgHdr(threadHdr);
					var msgs = thread.EnumerateMessages();
					while(msgs.hasMoreElements()){
						var msn = msgs.getNext();
						msn.QueryInterface(Components.interfaces.nsIMsgDBHdr);
						var uri = fol.getUriForMsg(msn);
						saveMsg(exportfolder,uri);
					}
				}catch(e){
					var uri = fol.getUriForMsg(threadHdr);
					saveMsg(exportfolder,uri);
				}
			}
			/* END CHANGES IN 0.1.5 */

		}
	}catch(e){
	}

	// Cerco nuove sottocartelle se esistono e faccio una ricorsione (se richiesto)
	if(fol.hasSubFolders && recurse){
		var subs = fol.GetSubFolders();	// Ottengo quello un enumerazione
		subs.first();	// Mi muoov sul primo elemento
		try{
			do{
				var item = subs.currentItem();	// Ottengo l'oggetto corrente dell'iterazione
				item.QueryInterface(Components.interfaces.nsIMsgFolder);	// In modo da poter utilizzare item come nsIMsgFolder

				exportFolder(item,exportfolder,recurse,keepstruct);	// Richiamo me stesso

				subs.next();	// Passo al prossimo oggetto

			}while(true);
		}catch(e){}
		
	}

 }


 /*
  * This is the listener for IMAP messages
  *
  */
function myUrlListener(){

	var listener = {

		fol : null, 
		exportfolder : null,
		uri : null,

		QueryInterface : function(iid)  {
			if (iid.equals(Components.interfaces.nsIUrlListener) ||
				iid.equals(Components.interfaces.nsISupports))
			 return this;
	
			throw Components.results.NS_NOINTERFACE;

			return 0;
		},

		OnStartRunningUrl: function ( url )
		{	
		
		},
		
		OnStopRunningUrl: function ( url, exitCode )
		{	
			try{

				setStatusBar(getString("smartsave.message.exportingmsg"));
				/* START CHANGES IN VERSION 0.1.5 */
				/* Note: Not sure this could work with IMAP messages...*/
				/* It work for local folder so if I have downaload everything */
				/* It should work fine... */
/*				var db = fol.getMsgDatabase(msgWindow);
				var threads = fol.getMessages(msgWindow);
				while(threads.hasMoreElements()){
					var threadHdr = threads.getNext();
					threadHdr.QueryInterface(Components.interfaces.nsIMsgDBHdr);
					try{
						var idThread = threadHdr.threadId;
						var thread = db.GetThreadContainingMsgHdr(threadHdr);
						var msgs = thread.EnumerateMessages();
						while(msgs.hasMoreElements()){
							c_msg++;	// NOT THIS IS NOT PRESENT IN EXPORT IN LOCAL FOLDER
							var msn = msgs.getNext();
							msn.QueryInterface(Components.interfaces.nsIMsgDBHdr);
							var uri = fol.getUriForMsg(msn);
							saveMsg(exportfolder,uri);
						}
					}catch(e){
						var uri = fol.getUriForMsg(threadHdr);
						saveMsg(this.exportfolder,uri);// NOT THIS DIFFERENT IN EXPORT IN LOCAL FOLDER
					}
				}*/
				/* END CHANGES IN 0.1.5 */
				/* Here the old version that work for IMAP, for any problem this should work fine */
				var msgs = this.fol.getMessages(msgWindow);
				while(msgs.hasMoreElements()){
					c_msg++;
					var msg = msgs.getNext();
					// Chiedo di aggiungere l'interfaccia per ottener l'header dell'email
					msg.QueryInterface(Components.interfaces.nsIMsgDBHdr);	
					var id = msg.messageKey;
					var msgUri = this.uri.slice(0,this.uri.length)+"#"+id;	// Creo io l'uri specifico in base all'uri del folder e all'id del messaggio
					saveMsg(this.exportfolder,msgUri);	// Salvo il messaggio

				}

				c_folder--;
			}catch(e){
				alert(getString("smartsave.message.nosuchmessage"));
			}
		}
	}

	return listener;
}

/*
 * This function export mails in the "special folder"
 *
 */
 function saveSpecialFolder(folder, inTool){

	// Determino l'url che mi interessa
	// In questo modo però esporto solo le cose in local folders, non quelli presenti in eventauli profili
	// perchè hanno degli uri differenti dipendentei dal profilo, per esportare questi bisogna utilizzare la
	// funzione export selected folder richiamdola col click destro del mouse

	if(inTool){
		openOption = false;
	}
	
	var url = "";
	var baseURL = "mailbox://nobody@Local%20Folders";

	if(folder == "INBOX"){
		url = baseURL + "/Inbox";
	} else if(folder == "SENT"){
		url = baseURL + "/Sent";
	} else if(folder == "DRAFTS"){
		url = baseURL + "/Drafts";
	} else if(folder == "ALL"){
		url = baseURL;
	}


	// Carico la mailbox
	var mailbox = RDF.GetResource(url);
	mailbox.QueryInterface(Components.interfaces.nsIMsgFolder);

	report = getString("smartsave.message.report1")+" \""+mailbox.name+"\".\n";
	tot_msg = 0;
	

	// Carico le preferenze
	var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	var askdir = null;
	var basefolder = null;
	var accept = true;

	try{
		askdir = pref.getCharPref("smartsave.prefs.basefolder.ask");
	}catch(e){
		askdir = "optionExport_askpath";
	}

	if(askdir=="optionExport_askpath"){	// Se devo chieder il percoso...
	
			var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
			fp.init(window,getString("smartsave.message.selectafolder"),fp.modeGetFolder);

			var basefolderFile = null; // carico qui il basefolder preferenziale
			try{
				basefolderFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
				basefolderFile.initWithPath(pref.getCharPref("smartsave.prefs.basefolder"));
			}catch(e){
				basefolderFile.initWithPath(getUserHome().path);
			}

			try{	// Controllo se esiste e lo assegno al filepicker come cartella da visualizzare
				if(basefolderFile && basefolderFile.exists())
					fp.displayDirectory = basefolderFile;
			}catch(e){}	

			// Mostro la finestra
			if(fp.show() != fp.returnCancel){
				basefolder = fp.fileURL.file.path;
			}else{
				accept = false;
			}

	} else {	// Se non lo devo chiedere...

		try{
			basefolder = pref.getCharPref("smartsave.prefs.basefolder");
		}catch(e){
			basefolder = ".";
		}

	}

	if(!accept)
		return null;

	// Non controllo che il basefoler esista perhè automaticamente mi viene creato se necessario
	// Dalle librerie XPCOM sottostanti

	var recurse = true;
	try{
		recurse = pref.getBoolPref("smartsave.prefs.recurse");
	}catch(e){
		recurse= true;
	}

	var keepstruct = true;
	try{
		keepstruct = pref.getBoolPref("smartsave.prefs.keepstruct");
	}catch(e){
		keepstruct = true;
	}

	report += getString("smartsave.message.report2")+": \""+basefolder+"\".\n";
	report += getString("smartsave.message.report3")+": "+recurse+".\n";
	report += getString("smartsave.message.report4")+": "+keepstruct+".\n";

	report += "\n["+getString("smartsave.message.report5")+"]\n"


	// Lancio la funzione eventualemnte ricorsiva per espotare le cartelle
	exportFolder(mailbox,basefolder,recurse,keepstruct);

	//report += "\n["+getString("smartsave.message.report6")+"]\n"

	alertEnd("smartsave.message.exportedfolderdoneok","smartsave.message.finishdialog");
 }

//////////////////////////////////////////////////////////////////////////
//					MISCELLANIA FUNCTION								//
//////////////////////////////////////////////////////////////////////////

/*
 * This function build the correct file name
 *
 */
function generateFileName(header){

	// Ottengo tutte le informaizoni dell'header del messaggio
	var subj = header.mime2DecodedSubject;
	if (subj == null){ subj = "No_Subject";} // Thanks to ildflue for this line of code
	subj = deleteBadChars(subj).substring(0,50);

	var from = header.mime2DecodedAuthor;
	if (from == null){ from = "No_Sender";}
	from = deleteBadChars(from);
	
	var recp = header.mime2DecodedRecipients;
	if (recp == null){ recp = "No_Recipient";}
	recp = deleteBadChars(recp);
	
	var date = new Date(parseInt(header.date)/1000);

	var secs = date.getSeconds();
	var mins = date.getMinutes()
	var hours = date.getHours();
	var day = date.getDate();
	var month = date.getMonth() + 1;
	if (day < 10) day = "0" + day;
	if (month < 10) month = "0" + month;        
	if (secs < 10) secs = "0" + secs;        
	if (mins < 10) mins = "0" + mins;
	if (hours < 10) hours = "0" + hours;
	var year = date.getFullYear();

	var rnd = Math.random() * 10000000;

	// Cairco le preferenze che contengon l'indicazione di come deve essere costruito il nome del file
	var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	var filename = "";
	try{
		filename = pref.getCharPref("smartsave.prefs.strFormat");

		var mode = pref.getCharPref("smartsave.prefs.format");
		if(mode == "optionExport_default")
			filename = "[SUBJECT]_[SENDER]_[YEAR]-[MONTH]-[DAY]_[HOUR]-[MIN]-[SEC]";
		if(mode == "optionExport_one")
			filename = "[YEAR]-[MONTH]-[DAY]_[HOUR]-[MIN]-[SEC]_[SENDER]_[SUBJECT]";
		if(mode == "optionExport_two")
			filename = "[YEAR]-[MONTH]-[DAY]_[HOUR]-[MIN]-[SEC]_[SUBJECT]";
		if(mode == "optionExport_four")
			filename = "[YEAR]-[MONTH]-[DAY]_[HOUR]-[MIN]-[SEC]_[SENDER]_[RECIPIENT]_[SUBJECT]";

	}catch(e){	// In caso di errore prendo la versione di default!
		filename = "[SUBJECT]_[SENDER]_[YEAR]-[MONTH]-[DAY]_[HOUR]-[MIN]-[SEC]";
	}

	// Costruisco il nome del file e aggiungo l'estensione

	filename = filename.replace(/\[YEAR\]/g,year);
	filename = filename.replace(/\[MONTH\]/g,month);
	filename = filename.replace(/\[DAY\]/g,day);

	filename = filename.replace(/\[HOUR\]/g,hours);
	filename = filename.replace(/\[MIN\]/g,mins);
	filename = filename.replace(/\[SEC\]/g,secs);

	filename = filename.replace(/\[SENDER\]/g,from);
	filename = filename.replace(/\[SUBJECT\]/g,subj);

	filename = filename.replace(/\[RECIPIENT\]/g,recp);

	filename = filename.replace(/\[RANDOM\]/g,rnd);	

	filename = filename.replace(/:/g,"-")

	var extension = ".eml";
	try{
		extension = pref.getCharPref("smartsave.prefs.extension");
	}catch(e){
		extension = ".eml";
	}
	if(extension.indexOf(".") < 0)
		extension = "."+extension;

	if(filename.length > 255){
		var oldfilename = filename;
		filename = filename.substring(0,200) + "..."
		report += "\t"+getString("smartsave.message.report16").replace(/\[OLDNAME\]/g,'"'+oldfilename+'"').replace(/\[NEWNAME\]/g,'"'+filename+'"')+"\n"
	}

	filename = deleteBadChars(filename);

	// Lo devo validare con le funzioni interne di Thunderbird
	// Nn so perchè ma se nn lo metto non funziona!!
	filename = GenerateValidFilename(filename,extension);

	return filename;
}

/*
 * Return the file separator for the current OS
 *
 */
function getFileSeparator(){
	var sep = "/";	//Di defaule mi ritorna quello dei sistemi unix
	 if (navigator.platform.toLowerCase().indexOf("win") != -1) // Controllo se sono su un sistema Window
	     sep = "\\";
    return sep;
}

/*
 * Set the status bar with the given text
 *
 */
function setStatusBar(text){
	// statusText è l'ID della barra di stato di Mozilla;
	// In questo modo posso settare gli attributi
	document.getElementById("statusText").setAttribute("label", text);
}

/*
 * Function that create a directory if it doesn' exists
 *
 */
function createDir(name){
	var dir = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
	dir.QueryInterface(Components.interfaces.nsIFile);	// Mi serve per poter creare la cartella
    dir.initWithPath(name);  
	if(!dir.exists()){	
		report +="\t"+getString("smartsave.message.report12").replace(/\[DIRECTORY\]/g,'"'+name+'"')+"\n";
		dir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0777);
	}
}


/*
 * Function that show the option dialog
 *
 */
function showOptionDialog(){
	// Carico la finestra delle opzioni

   if(openOption)
   	   var dlg = window.openDialog("chrome://smartsave/content/settings.xul");
   else
	   openOption = true;

}


/*
 * Function used for localization in JavaScript
 *
 */
function getString(ident){
	// Devo caricare il servizio che mi apre i file .properties
	var strService = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
	var bundle = strService.createBundle("chrome://smartsave/locale/messages.properties");
	try{
		var str = bundle.GetStringFromName(ident).replace(/\[NL\]/g,"\n").replace(/\[TAB\]/g,"\t");
		return str;
	}catch(e){
		return "NO SUCH STRING WITH ID :\""+ident+"\"";
	}

}

/*
 * This function just play the end signal
 *
 */
function beep(){
	// Url del suono
	var soundURL = "chrome://smartsave/content/sound.wav";
	
	// Carico i componenti necessari ad eseguire il suono
	var	gSound = Components.classes["@mozilla.org/sound;1"].createInstance(Components.interfaces.nsISound);
	var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
	var url = ioService.newURI(soundURL, null, null);
	gSound.play(url);

}

/*
 * Function that show, if required, the end messages
 *
 */
function alertEnd(msgStatus, msgAlert){

	report += "["+getString("smartsave.message.report6")+"]\n";
	report += "\n"+getString("smartsave.message.report14").replace(/\[COUNTER\]/g,""+tot_msg);

	setStatusBar(getString(msgStatus));

	var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);	
	var toBeep = false;
	try{
		toBeep = pref.getBoolPref("smartsave.prefs.beep");
	}catch(e){
		toBeep = false;
	}

	if(toBeep)
		beep();

	var toAlert = true;
	try{
		toAlert = pref.getBoolPref("smartsave.prefs.alert");
	}catch(e){
		toAlert = true;
	}

	if(toAlert)
		//alert(getString(msgAlert));
		showReport();

}


/*
 * Function that show the report window
 *
 */
function showReport(){

	window.openDialog("chrome://smartsave/content/logwin.xul","smartsave_report","",report);

}


/*
 * Function that gain the home of the user
 *
 * Return an nsIFile
 *
 */

function getUserHome(){
 
  result = {}
  var prov = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIDirectoryServiceProvider);
  return prov.getFile("Home",result)

}


/*
 * Delete all bad charachters that aren't accepted from many file system
 * Thanks to Xavier for this piece of code
 */
function deleteBadChars(txt){

	if (txt == null || txt == "") text = "EMPTY";
	var badChars = /(\\|\/|\:|\"|\<|\>|\||\?|\*)+/g;
	txt = txt.replace(badChars, "_");
	return txt;

}
