/*
 * Copyright (c) 2015 Hussain Bharmal. All rights reserved.
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true */
/*global */

(function () {
    "use strict";
    
    var exec = require('child_process').exec,
		fs 	 = require('fs');
		
    var imgMagickInstallationPath;
	
	function setImgMagickInstallPath(path){
		process.env["Path"]+= ";"+path;		// some issue with latest versions of imagemagick, need to temporarily add to the path.
		imgMagickInstallationPath = path.replace(/\\/g,"/");
	};
	
	function getImgMagickInstallPath(cb){
		var path = process.env["Path"];
			path = path.replace(/\\/g,"/").split(";");
			for(var p=0;p<path.length;p++){
				if(path[p].indexOf("ImageMagick-") != -1){
					imgMagickInstallationPath = path[p];
					cb(null, imgMagickInstallationPath);
					break;
				}
			};
			cb("path not found", null);
	};
		

    function cmdImgConvert(cmdStr, cb) {
		
		var fullCmd = '"'+imgMagickInstallationPath+'/convert" '+ cmdStr;

		exec(fullCmd, function(error, stdout, stderr){
			if(error){
				cb(stderr, null);
			} else{
				cb(null, "Conversion completed");
			}
		});
    };
	
	function deleteFile(filePath, cb){
		fs.unlink(filePath, function(err){
			if(err){
				cb(err,null);
			} else{
				cb(null,true);
			}				
		})
	};
    
    /**
     * Initializes the domain with several commands.
     * @param {DomainManager} domainManager The DomainManager for the server
     */
    function init(domainManager) {
        if (!domainManager.hasDomain("hbImgConvert")) {
            domainManager.registerDomain("hbImgConvert", {major: 0, minor: 1});
        };
        domainManager.registerCommand(
            "hbImgConvert",       // domain name
            "imgConvert",    // command name
            cmdImgConvert,   // command handler function
            true          // false: this command is synchronous in Node, true: this command is asynchronous in Node
        );
		domainManager.registerCommand(
            "hbImgConvert",
            "setImgMagickInstallPath",
            setImgMagickInstallPath,
            false
        );
		domainManager.registerCommand(
            "hbImgConvert",
            "getImgMagickInstallPath",
            getImgMagickInstallPath,
            true
        );
		domainManager.registerCommand(
            "hbImgConvert",
            "deleteFile",
            deleteFile,
            true
        );
    };
    
    exports.init = init;
    
}());