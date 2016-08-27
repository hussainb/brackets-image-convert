Brackets-Image-Convert
============================

# Image converting Extension for Brackets
An extension for [Brackets](https://github.com/adobe/brackets/) which provides a wizard like interface to convert images using [Imagemagick](http://www.imagemagick.org/script/binary-releases.php).

This extension requires Imagemagick to be installed on your system and its installation folder location added to the path Environment variable.

### How to Install
1. Select **File > Extension Manager...**
2. Search for this extension.
3. Click on the **Install** button.
4. Right click on an image in the project view and select "Convert" from the context menu.
5. If the extension finds imagemagick installed you should be able to see a form with a few fields,
   else you may see a notification asking to download/specify path of imagemagick.

### How to Use Extension
1. Right click on an image in the project panel and select convert.
2. If you require basic conversion such as changing width/height of the image or add transparency,
   fillup the wizard form and press convert, the converted image will be available at the same location of the input image.
3. If you wish to write your own convert command,
   select the advanced tab and fill up your command in the cmd textarea and specify an output file.
   The command will be saved for later use.



### License
MIT-licensed.

### Compatibility
Tested on Brackets 1.4 to 1.7 on Windows 7 and windows 8.

### Change Log
v1.0.2 - Bug fixes, UI cleanup, usage reports.
v1.0.1 - Maintainance release.
v1.0.0 - Initial release.
