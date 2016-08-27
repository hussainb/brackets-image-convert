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

/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, brackets, $ */

define(function (require, exports, module) {
    "use strict";

    // Get dependencies.
    var AppInit = brackets.getModule('utils/AppInit'),
        CommandManager = brackets.getModule("command/CommandManager"),
        ProjectManager = brackets.getModule("project/ProjectManager"),
        Menus = brackets.getModule('command/Menus'),
        ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
        FileSystem = brackets.getModule('filesystem/FileSystem'),
        Dialogs = brackets.getModule("widgets/Dialogs"),
        NodeDomain = brackets.getModule("utils/NodeDomain"),
        _ = brackets.getModule("thirdparty/lodash");

    // Load stylesheet.
    ExtensionUtils.loadStyleSheet(module, 'main.css');

    var cmdConvert,
        MENU_CMD_MARK = "project-menu.convert",
        MENU_ITEM_CONVERT = "Convert",
        selectedItem,
        convertDialogHTML = require('text!templates/convertDialog.html'),
        userDataFolderPath = ExtensionUtils.getModulePath(module, "userData"),
        userDataJsonPath = ExtensionUtils.getModulePath(module, "userData/data.json"),
        hbImgConvertDomain = new NodeDomain("hbImgConvert", ExtensionUtils.getModulePath(module, "node/hbImgConvertDomain")),

        imageMagickPathFound = false,
        logTexts = "",
        userUUID,
        usageStatUrl = "http://bracketsimageconvert-binby.rhcloud.com/log",

        wizardConvertStr = {
            resize: "-resize $W$x$H$ ",
            quality: "-quality $quality$ ",
            transColor: "-transparent $transColor$ ",
            transFuzz: "-fuzz $transFuzz$ ",
            inFile: '"' + "$inFile$" + '" ',
            outFile: '"' + "$outFile$" + '" '
        };

    function addToLog(cmdType, logText) {
        var logItem = "<li>" + "<b>" + cmdType + ":</b> " + logText + "</li>";
        $("#convert-logStatus").prepend(logItem);
        logTexts = logItem + logTexts;
    };

    function convert(cmdStr, success, fail) {
        addToLog("Convert command", cmdStr);

        hbImgConvertDomain.exec("imgConvert", cmdStr)
            .done(function (successful) {
                addToLog("Success", successful);
                success(successful);
                logUsageStat("Conversion successful");
            }).fail(function (err) {
                addToLog("Error", err);
                fail(err);
                logUsageStat("Conversion failed");
            });

    };


    function generateConvertCmd(params) {
        var resizeStr = '';
        var cmd = '';

        for (var key in wizardConvertStr) {
            if (key == "resize" && (params.width || params.height)) {
                var resizeStr = wizardConvertStr["resize"].replace("$W$", params.width || '');
                resizeStr = resizeStr.replace("$H$", params.height || '');

                if (params.width && params.height && params.height.trim() != '') {
                    resizeStr = resizeStr.trim();
                    resizeStr += '! ';
                }

                cmd += resizeStr;
            }
            if (params[key]) {
                cmd += wizardConvertStr[key].replace("$" + key + "$", params[key]);
            }
        };

        return cmd;
    };

    function saveSettings(settingsData) {
        hbImgConvertDomain.exec("setImgMagickInstallPath", settingsData.imgMagickPath);
        localStorage.setItem("hussainb.brackets-image-convert", JSON.stringify(settingsData));
        imageMagickPathFound = true;
    };

    function getSavedSettings() {
        if (localStorage.getItem("hussainb.brackets-image-convert")) {
            return JSON.parse(localStorage.getItem("hussainb.brackets-image-convert"));
        }
        return {};
    };

    function updatePrevCmdList(newCmds) {
        var listItems = "";
        for (var i = 0; i < newCmds.length; i++) {
            listItems += '<li><p>' + newCmds[i] + '</p><span><a class="convert-useCmd" data-listid="' + i + '">use</a>, <a class="convert-deleteCmd" data-listid="' + i + '">delete</a></span></li>';
        };

        $("#convert-commands-list").html(listItems);
    };

    function updateUserCmd(advancedCommand, toDeleteIdx) {

        readFile(userDataJsonPath, function (err, data) {
            if (!data) return;

            var userData = JSON.parse(data);
            var previousCmds = userData.previousCmds;
            var cmdFound = false;

            if (toDeleteIdx) {
                previousCmds.splice(toDeleteIdx, 1);
            };

            if (advancedCommand) {
                cmdFound = previousCmds.indexOf(advancedCommand) == -1;
            };

            if (cmdFound) {
                previousCmds.unshift(advancedCommand);
            };
            userData.previousCmds = previousCmds;
            if (toDeleteIdx || cmdFound) {
                writeFile(userDataJsonPath, JSON.stringify(userData));
                updatePrevCmdList(previousCmds);
            }

        })

    };



    function processAdvanced(advancedData) {

        var advancedCommand = advancedData[0].value;
        var outFilePath = selectedItem._parentPath + advancedData[1].value;
        var convertCmdStr = advancedCommand + ' "' + selectedItem._path + '" ' + '"' + outFilePath + '"';

        convert(convertCmdStr, function success(success) {
            console.log(success);
        }, function error(err) {
            console.log("conversion failed");
        });

        updateUserCmd(advancedCommand);

    };

    function processWizard(formData) {
        var formFields;
        var cmdStr;

        formFields = _.reduce(formData, function (result, elm, n) {
            if (elm.value) {
                result[elm.name] = elm.value.trim();
            }
            return result;
        }, {});

        formFields.inFile = selectedItem._path;
        formFields.outFile = selectedItem._parentPath + formFields.outFile;

        cmdStr = generateConvertCmd(formFields);

        deleteFile(formFields.outFile, function () { // deleting the file will trigger brackets to deselect the outpout file if it is currently selected. 
            setTimeout(function () { // this is to let brackets detect the file deletion and give it some time to update its editor, 
                convert(cmdStr, function success(success) {
                    //                    console.log(success);
                }, function error(err) {
                    //                    console.log("conversion failed");
                });
            }, 1500);
        });

    };


    function showConvertDialog() {

        selectedItem = ProjectManager.getSelectedItem();

        var convertDialog = Dialogs.showModalDialogUsingTemplate(convertDialogHTML, false);
        var $convertDialog = convertDialog.getElement();

        if (!imageMagickPathFound && !getSavedSettings().imgMagickPath) { // if saved settings not found
            showTab("#convert-settings");
        } else {
            $("input[name='imgMagickPath']").val(getSavedSettings().imgMagickPath);
        };

        $('.convert-selectedFileName').html(selectedItem._name);
        $("#convert-logStatus").append(logTexts);

        $convertDialog.find('.convert-tabs li').on('click', function () {
            showTab($(this).attr('data-tab'));
        });

        $convertDialog.find('#convert-settingsForm').on('submit', function (event) {
            event.preventDefault();
            var imgMagickPath = $("input[name='imgMagickPath']").val();
            if (imgMagickPath != "")
                imgMagickPath = imgMagickPath.replace(/\\/g, "/");
            saveSettings({
                imgMagickPath: imgMagickPath
            });
        });

        $convertDialog.find('#convert-wizardForm').on('submit', function (event) {
            event.preventDefault();
            if (!imageMagickPathFound && !getSavedSettings().imgMagickPath) {
                showTab("#convert-settings");
                return false;
            };
            processWizard($('#convert-wizardForm').serializeArray());
            showTab("#convert-log");
        });


        $convertDialog.find('#convert-advancedForm').on('submit', function () {
            event.preventDefault();
            if (!imageMagickPathFound && !getSavedSettings().imgMagickPath) {
                showTab("#convert-settings");
                return false;
            };
            processAdvanced($('#convert-advancedForm').serializeArray());
            showTab("#convert-log");
        });

        $convertDialog.on('click', '.convert-useCmd', function () {
            $("textarea[name='advancedCmd']").val($(this).parents('li').children('p').text());
        });

        $convertDialog.on('click', '.convert-deleteCmd', function () {
            updateUserCmd(null, $(this).attr('data-listid'));
        });

        $convertDialog.on('click', '#convert-closeModal', function () {
            convertDialog.close();
        });

        convertDialog.done(function (id) {
            //console.log(id);
        });

        readFile(userDataJsonPath, function (err, data) {
            if (data) updatePrevCmdList(JSON.parse(data).previousCmds)
        });
    };

    function showTab(sectionRef) {
        $('.convert-tabs li').removeClass('convert-active');
        $('.convert-tab-panel').removeClass('convert-active');
        $("li[data-tab='" + sectionRef + "']").addClass('convert-active');
        $(sectionRef).addClass('convert-active');
    };

    function readFile(file, callback) {
        FileSystem.getFileForPath(file).read({
            encoding: 'utf8'
        }, callback);
    };


    function writeFile(file, content) {
        FileSystem.getFileForPath(file).write(content, {
            encoding: 'utf8'
        });
    };

    function deleteFile(filePath, cb) {

        hbImgConvertDomain.exec("deleteFile", filePath)
            .done(function (successful) {
                cb();
            }).fail(function (err) {
                cb(); // call even if not able to delete, imagemagick will replace.
            });
    };

    function genUUID() {
        return '_' + Math.random().toString(36).substr(2, 9);
    };

    function assignUUIDToUser() {
        readFile(userDataJsonPath, function (err, data) {
            if (!data) return;

            var userData = JSON.parse(data);

            if (!userData.UUID) {
                userData.UUID = genUUID();
                writeFile(userDataJsonPath, JSON.stringify(userData));
            }

        })
    };

    function logUsageStat(conversion) {
        //userUUID
        if (!userUUID) {
            readFile(userDataJsonPath, function (err, data) {
                if (!data) return;
                var userData = JSON.parse(data);

                if (userData.UUID) {
                    userUUID = userData.UUID;
                    $.get(usageStatUrl + '?UUID=' + userUUID + '&conversion=' + conversion);
                }

            })
        } else {
            $.get(usageStatUrl + '?UUID=' + userUUID + '&conversion=' + conversion);
        }

    }

    AppInit.appReady(function () {
        assignUUIDToUser();
        cmdConvert = CommandManager.register(MENU_ITEM_CONVERT, MENU_CMD_MARK, showConvertDialog);
        var menu = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU);
        menu.addMenuItem(MENU_CMD_MARK);

        hbImgConvertDomain.exec("getImgMagickInstallPath")
            .done(function (imgMagickPath) {
                imageMagickPathFound = true;

            }).fail(function (err) {
                console.log("Imagemagick not found in path variable");
                var savedPath = getSavedSettings().imgMagickPath;
                if (savedPath) {
                    hbImgConvertDomain.exec("setImgMagickInstallPath", savedPath)
                    imageMagickPathFound = true;
                } else {
                    logUsageStat("Imagemagick not found in path variable");
                }

            });

    });

});
