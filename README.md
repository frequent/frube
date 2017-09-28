# Frube

Youtube player with private playlist. 

Use on [https://frube.eu](https://frube.eu) (while API limits last).

Inspired by Boramalper's [Essentia Youtube Player](https://github.com/boramalper/Essential-YouTube). Built using [RenderJS](https://renderjs.nexedi.com) and [jIO](https://jio.nexed.com).

## Why Frube?

* My Chromebook OS is running only free software. No web-radio, no flash, Youtube works.
* I don't want to upload my playlist to some site. Sites disappear. And sell my taste.
* In times where I owning merely means streaming, I want to at least own my taste.

## Features

* Search Youtube and save to your playlist 
* Playlist is kept on Indexeddb and Dropbox, syncs on refresh/manual trigger
* Play Shuffle/Repeat/Hi-Lo Res Video/(should) resume after connection loss
* Keep playing if tab is not active
* Edit/Rate/Rank video

## Get Your Own Frube

* Fork this repo
* Get your own [Youtube Data API key](https://developers.google.com/youtube/v3/)
* Get your own [Dropbox App key](https://www.dropbox.com/developers/apps/create)
* Add both to your fork's [index.js file](https://github.com/frequent/frube/blob/master/index.js)
* Modify your [index.html file](https://github.com/frequent/frube/blob/master/index.html) to your liking
* Host your fork on gh-pages following steps [outlined here](https://pages.github.com/)
* Your Frube will be on **https://[username].github.io/frube/**
* Make sure your Youtube/Dropbox redirect URIs point to this gh-pages url
* Viola!


## License

Frube is Free Software. [RenderJS](https://renderjs.nexedi.com) and [jIO](https://jio.nexed.com) are GPLv3 - use, improve and contribute back.
