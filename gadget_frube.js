/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, rJS, jIO, RSVP, YT, JSON, FormData, URL, loopEventListener, Math */
(function (window, rJS, jIO, RSVP, YT, JSON, FormData, URL, loopEventListener, Math) {
  "use strict";

  // KUDOS: https://github.com/boramalper/Essential-YouTube
  // https://developers.google.com/youtube/iframe_api_reference
  // https://developers.google.com/youtube/player_parameters?playerVersion=HTML5
  // https://getmdl.io/components/index.html

  // XXX remove default api-keys
  // XXX upvote/downvote, decreasing weight by time?
  // XXX repair
  // XXX dropbox connect submit not working
  // XXX sync indicator
  // XXX fix delete all, should not allow next/dump on player, player should stop
  // XXX fix save of thumbnail in base64, display of image on change


  /////////////////////////////
  // parameters
  /////////////////////////////
  var ARR = [];
  var STR = '';
  var SPC = ' ';
  var POS = 'data-position';
  var ID = 'data-video';
  var ACTION = 'data-action';
  var DELETE = 'delete';
  var ATTACH = 'attach_file';
  var BUTTON = 'button';
  var CLOSE = 'frube-dialog-close';
  var OPEN = 'frube-dialog-open';
  var DIALOG = '.frube-dialog-';
  var IS_SLIDER = 'slider';
  var UPLOAD = 'frube-upload';
  var OVERLAY = 'frube-overlay';
  var CONFIGURE = 'configure';
  var FORBIDDEN = 403;
  var QUOTA = 'quotaExceeded';
  var ERR_QUOTA = '(Quota exceeded)&nbsp;';
  var SECTION = 'section';
  var BUTTON_I = 'button i';
  var PLAYING = 'frube-video-playing';
  var LISTED = 'frube-video-listed';
  var DELETED = 'frube-video-deleted';
  var DISABLED = 'disabled';
  var MINUS = '-';
  var LO = 'tiny';
  var HI = 'hd720'; 
  var FILTER = 'filter';
  var REMOVE = 'delete_sweep';
  var NAME = 'name';
  var PLAY = 'library_music';
  var SEARCH = 'search';
  var ADD = 'playlist_add';
  var UNDO = 'undo_edit';
  var NONDO = 'frube-can-undo';
  var SEARCHING = 'searching';
  var WATCHING = 'watching';
  var SLIDER = 'frube-slider';
  var HIDDEN = 'frube-hidden';
  var REPEAT = '.frube-btn-repeat';
  var QUALITY = '.frube-btn-quality';
  var SHUFFLE = '.frube-btn-shuffle';
  var SEARCH_INPUT = '.frube-search-input';
  var FILTER_INPUT = '.frube-filter-input';
  var SUBMIT = '.frube-dialog-submit';
  var PLACEHOLDER = 'placeholder.png';

  /////////////////////////////
  // methods
  /////////////////////////////
  function makeList(my_nodeList) {
    return ARR.slice.call(my_nodeList);
  }

  function setVideoHash(my_video_id) {
    window.location.hash = my_video_id;
  }

  function getTimeStamp() {
    return new window.Date().getTime();
  }

  function getActiveElem() {
    return window.document.activeElement;
  }

  function getAllElems(my_element, my_selector) {
    return (my_element || window.document).querySelectorAll(my_selector);
  }

  function getElem(my_element, my_selector) {
    return (my_element || window.document).querySelector(my_selector);
  }

  function getAttr(my_event, my_attribute) {
    return my_event.target.querySelector(BUTTON).getAttribute(my_attribute);
  }

  function setOverlay(my_element, my_class_flag) {
    my_element.classList.add(OVERLAY, my_class_flag);
  }

  function unsetOverlay(my_element, my_class_flag) {
    my_element.classList.remove(OVERLAY, my_class_flag);
  }

  function getVideo(my_element, my_video_id) {
    return my_element.querySelector('div[data-video="' + my_video_id + '"]');
  }

  function setTitle(my_title) {
    window.document.title = my_title;
  }

  function setButtonIcon(my_element, my_icon) {
    my_element.querySelector(BUTTON_I).textContent = my_icon;
  }

  function buildTemplateDict(my_template_dict) {
    makeList(getAllElems(null, 'script[type="text/x-supplant-template"]'))
      .forEach(function (item) {
        my_template_dict[item.id] = item.textContent;
      });
    return my_template_dict;
  }

  function mergeDict(my_return_dict, my_new_dict) {
    var param;
    for (param in my_new_dict) {
      if (my_new_dict.hasOwnProperty(param)) {
        my_return_dict[param] = my_new_dict[param];
      }
    }
    return my_return_dict;
  }

  function getVideoHash() {
    var id = window.location.hash.slice(1, 1 + 11);
    if (id.length === 11) {
      return id;
    }
  }

  function getVideoId(my_arr, my_id, my_jump) {
    var len = my_arr.length,
      new_id,
      i;
    if (!my_jump) {
      return my_arr[(Math.round(Math.random() * len, 0)) - 1];
    }
    for (i = 0; i < len; i += 1) {
      if (my_arr[i] === my_id) {
        new_id = my_arr[i + my_jump];
      }
    }
    if (new_id) {
      return new_id;
    }
    if (my_jump < 0) {
      return my_arr[len - 1];
    }
    return my_arr[0];
  }

  function resizeFileToBase64(my_file) {
    return new RSVP.Promise(function (resolve, reject) {
      var img = new Image(),
        canvas = window.document.createElement("canvas");

      img.onload = function () {
        canvas.width = 320;
        canvas.height = 320;
        canvas.getContext("2d").drawImage(img, 0, 0, 320, 320);
        resolve(canvas.toDataURL(my_file.type));
      };
      img.onerror = function (event) {
        reject(event);
      };
      img.src = URL.createObjectURL(my_file);
    });
  }

  function setBufferList(my_dict) {
    var promise_list = [],
      id;
    for (id in my_dict) {
      if (my_dict.hasOwnProperty(id)) {
        promise_list.push(my_dict[id]);  
      }
    }
    return promise_list;
  }

  function setDom(my_node, my_string, my_purge) {
    var faux_element = window.document.createElement(SECTION);

    if (my_purge) {
      while (my_node.firstChild) {
        my_node.removeChild(my_node.firstChild);
      }
    }

    faux_element.innerHTML = my_string;
    makeList(faux_element.children).forEach(function (element) {
      my_node.appendChild(element);
    });
  }

  function setViewsSlider(my_element, my_stats) {
    var likes = parseInt(my_stats.likeCount, 10),
      dislikes = parseInt(my_stats.dislikeCount, 10);

    window.componentHandler.upgradeDom();
    my_element.MaterialProgress.setProgress(likes * 100 / (likes + dislikes));
  }

  function setVideoSlider(my_element, my_stats) {
    my_element.setAttribute("max", parseDuration(my_stats.duration));
    my_element.value = 0;
  }

  // http://javascript.crockford.com/remedial.html
  if (!String.prototype.supplant) {
    String.prototype.supplant = function (o) {
      return this.replace(
        /\{([^{}]*)\}/g,
        function (a, b) {
          var r = o[b];
          return typeof r === 'string' || typeof r === 'number' ? r : a;
        }
      );
    };
  }

  //https://stackoverflow.com/a/4760279  
  function dynamicSort(prop) {
    var sortOrder = 1;
    if (prop[0] === MINUS) {
      sortOrder = -1;
      prop = prop.substr(1);
    }
    return function (a, b) {
      var result = (a[prop] < b[prop]) ? -1 : (a[prop] > b[prop]) ? 1 : 0;
      return result * sortOrder;
    };
  }

  // http://stackoverflow.com/a/25209563
  function parseDuration(duration) {
    var matches = duration.match(/[0-9]+[HMS]/g),
      seconds = 0;

    matches.forEach(function (part) {
      var unit = part.charAt(part.length-1),
        amount = parseInt(part.slice(0,-1), 10);
  
        switch (unit) {
          case 'H':
            seconds += amount * 60 * 60;
            break;
          case 'M':
            seconds += amount * 60;
            break;
          case 'S':
            seconds += amount;
            break;
          default:
        }
      });
      return seconds;
  }

  function setArtistAndTitle(my_item) {
    return [
      my_item.custom_artist,
      my_item.custom_title || my_item.original_title,
      my_item.custom_album
    ].filter(Boolean).join(" - ");
  }

  function setVolume(my_player, my_event) {
    if (my_player.isMuted()) {
      setButtonIcon(my_event.target, "volume_up");
      my_player.unMute();
    } else {
      setButtonIcon(my_event.target, "volume_off");
      my_player.mute();
    }
  }

  function playOrPause(my_player) {
    if (my_player.getPlayerState() === YT.PlayerState.PLAYING) {
      my_player.pauseVideo();
    } else {
      my_player.playVideo();
    }   
  }

  rJS(window)

    /////////////////////////////
    // state
    /////////////////////////////
    .setState({
      scroll_trigger: 300,
      scroll_buffer: 250,
      search_buffer: 500,
      slider_interval: 500,
      mode: WATCHING,
      search_time: null,
      video_duration: null,
      last_key_stroke: null,
      last_main_pos: 0,
      next_page_token: null,
      slider_in_use: false,
      is_searching: false,
      play: null,
      quality: LO
    })

    /////////////////////////////
    // ready
    /////////////////////////////
    .ready(function () {
      var gadget = this,
        element = gadget.element;

      gadget.property_dict = {
        search_result_dict: {},
        buffer_dict: {},
        queue_list: [],
        player: null,
        error_status: element.querySelector('.frube-error'),
        action_container: element.querySelector(".frube-action"),
        main: element.querySelector(".frube-page-content"),
        video_info: element.querySelector(".frube-video-info"),
        video_controller: element.querySelector(".frube-video-controls"),
        video_slider: element.querySelector(".frube-slider"),
        sync_button: element.querySelector(".frube-btn-sync"),
        search_results: element.querySelector(".frube-search-results"),
        playlist: element.querySelector(".frube-playlist-results"),
        playlist_menu: element.querySelector(".frube-playlist-menu"),
        player_container: element.querySelector(".frube-player-container"),
        player_controller: element.querySelector(".frube-player-controller"),
      };

      gadget.template_dict = buildTemplateDict({});

      return gadget.loopSlider();
    })

    /////////////////////////////
    // acquired methods
    /////////////////////////////
    .declareAcquiredMethod('frube_create', 'frube_create')
    .declareAcquiredMethod('frube_repair', 'frube_repair')
    .declareAcquiredMethod('frube_allDocs', 'frube_allDocs')
    .declareAcquiredMethod('frube_put', 'frube_put')
    .declareAcquiredMethod('frube_get', 'frube_get')
    .declareAcquiredMethod('frube_remove', 'frube_remove')
    .declareAcquiredMethod('tube_create', 'tube_create')
    .declareAcquiredMethod('tube_allDocs', 'tube_allDocs')
    .declareAcquiredMethod('tube_get', 'tube_get')

    /////////////////////////////
    // published methods
    /////////////////////////////

    /////////////////////////////
    // declared methods
    /////////////////////////////
    .declareMethod("render", function (my_option_dict) {
      var gadget = this,
        dict = gadget.property_dict,
        queue = new RSVP.Queue();

      // ensure material design is applied to injected DOM
      window.componentHandler.upgradeDom();
      mergeDict(dict, my_option_dict);

      return new RSVP.Queue()
        .push(function () {
          RSVP.all([
            gadget.tube_create({"type": 'youtube', "api_key": dict.youtube_id}),
            gadget.frube_create({"type": 'indexeddb', "database": 'frube'})
          ]);
        })
        .push(function() {
          return gadget.refreshPlaylist();
        })
        .push(function () {
          var video = getVideoHash() || dict.queue_list[0];
          if (video) {
            return gadget.changeState({"play": video});
          }
          return gadget.enterSearch();
        });
    })

    .declareMethod("loadVideo", function (my_video_id) {
      var gadget = this,
        dict = gadget.property_dict,
        temp = gadget.template_dict,
        state = gadget.state,
        element = gadget.element,
        player = dict.player,
        info = dict.video_info,
        main = dict.main;

      return new RSVP.Queue()
        .push(function () {
          var hd_check = element.querySelector(QUALITY).checked;

          // switch video quality.
          if (state.quality === LO && hd_check) {
            dict.player.destroy();
            return gadget.changeState({"quality": HI});
          }
          if (state.quality === HI && !hd_check) {
            dict.player.destroy();
            return gadget.changeState({"quality": LO});
          }
          return;
        })
        .push(function () {

          // h is not my API :)
          if (!player || (player && !player.h)) {
            dict.player = new YT.Player('player', {
              videoId: my_video_id,
              width: main.clientWidth,
              height: Math.max(main.clientWidth * 0.66 * 9 / 16, 250),
              events: {
                "onReady": function (event) {
                  event.target.playVideo();
                },
                "onStateChange": function (event) {
                  return gadget.videoOnStateChange();
                }
              },
              playerVars: {
                "showinfo": 0,
                "disablekb": 1,
                "iv_load_policy": 3,
                "rel": 0,
                "vq": gadget.state.quality
              }
            });
          } else {
            player.loadVideoById(my_video_id);
          }
          return;
        })
        .push(function () {
          return gadget.tube_get(my_video_id);
        })
        .push(function (my_response) {
          var item = dict.search_result_dict[my_video_id] = my_response.items[0];

          setTitle(item.snippet.title);
          setDom(info, temp.video_entry_template.supplant({
            "title": item.snippet.title,
            "video_id": my_video_id,
            "views": parseInt(item.statistics.viewCount, 10).toLocaleString()
          }), true);

          setViewsSlider(info.querySelector(".frube-like"), item.statistics);
          setVideoSlider(dict.video_slider, item.contentDetails);

        })
        .push(undefined, function (error) {
          if (error.type === FORBIDDEN && error.detail === QUOTA) {
            dict.error_status.textContent = ERR_QUOTA;
            dict.error_status.classList.remove(HIDDEN);
            getElem(gadget.element, '.frube-dialog-configure').showModal();
          }
          throw error;
        });
    })

    .declareMethod("changeRank", function (my_id, my_pos, my_shift) {
      var gadget = this;
      return new RSVP.Queue()
        .push(function () {
          return gadget.frube_get(my_id);
        })
        .push(function (video_data) {
          video_data.pos = parseInt(my_pos, 10) + my_shift;
          return gadget.frube_put(my_id, video_data);
        })
        .push(function () {
          return gadget.refreshPlaylist();
        });
    })

    .declareMethod("videoOnStateChange", function () {
      var gadget = this,
        player = gadget.property_dict.player,
        current_state = player.getPlayerState(), 
        play_icon = gadget.element.querySelector(".frube-btn-play-pause i");
      if (current_state === YT.PlayerState.ENDED) {
        if (gadget.element.querySelector(REPEAT).checked) {
          player.seekTo(0, true);
          player.playVideo();
        } else {
          play_icon.textContent = "play_arrow";
          return gadget.jumpVideo(1);
        }
      } else if (current_state === YT.PlayerState.PLAYING) {
        play_icon.textContent = "pause";
      } else {
        play_icon.textContent = "play_arrow";
      }
    })

    .declareMethod("removeVideo", function (my_video_id, my_element) {
      var gadget = this,
        dict = gadget.property_dict;

      // undo = unflag for deletion
      if (dict.buffer_dict[my_video_id]) {
        setButtonIcon(my_element, REMOVE);
        unsetOverlay(getVideo(dict.playlist, my_video_id), DELETED);
        delete dict.buffer_dict[my_video_id];
      } else {
        dict.buffer_dict[my_video_id] = gadget.frube_remove(my_video_id);
        
        // no undo from player directly
        if (!my_element.querySelector(BUTTON).classList.contains(NONDO)) {
          return new RSVP.Queue()
            .push(function() {
              return gadget.refreshPlaylist();
            })
            .push(function () {
              return gadget.jumpVideo(1);
            });
        }
        setButtonIcon(my_element, UNDO);
        setOverlay(getVideo(dict.playlist, my_video_id), DELETED);
      }
      return;
    })

    .declareMethod("handleDialog", function (my_event) {
      var gadget = this,
        action = my_event.target.getAttribute(ACTION),
        dialog = getElem(gadget.element, (DIALOG + action)),
        active_element = getActiveElem(),
        video_id,
        form_data;

      if (active_element && active_element.classList.contains(CLOSE)) {
        dialog.close();
        return;
      }
      if (!dialog.open) {
        dialog.showModal();
        return;
      }
      if (action === 'edit') {
        video_id = getAttr(event, ID);
        form_data = new FormData(my_event.target);

        return new RSVP.Queue()
          .push(function () {
            return gadget.frube_get(video_id);
          })
          .push(function (video) {
            video.custom_title = form_data.get("frube-edit-custom-title");
            video.custom_album = form_data.get("frube-edit-custom-album");
            video.custom_artist = form_data.get("frube-edit-custom-artist");
            video.custom_cover = form_data.get("frube-edit-custom-cover");
            dialog.close();
            return gadget.frube_put(video_id, video);
          })
          .push(function () {
            return gadget.refreshPlaylist();
          });
      }
      if (action === CONFIGURE) {

      }
    })

    .declareMethod("editVideo", function (my_event, my_video_id) {
      var gadget = this,
        action = my_event.target.getAttribute(ACTION),
        dialog = getElem(gadget.element, (DIALOG + action)),
        temp = gadget.template_dict,
        button = dialog.querySelector(SPC + SUBMIT);

      if (button) {
        button.setAttribute("data-video", my_video_id);
        return new RSVP.Queue()
          .push(function () {
            return gadget.frube_get(my_video_id);
          })
          .push(function (video_data) {
            setDom(dialog.querySelector('.frube-dialog-content'),
              temp.edit_entry_template.supplant({
                "video_title": video_data.custom_title,
                "video_artist": video_data.custom_artist,
                "video_album": video_data.custom_album,
                "video_cover": video_data.custom_cover || PLACEHOLDER
              }), true);
            window.componentHandler.upgradeDom();
            return;
          })
          .push(function () {
            getElem(gadget.element, (DIALOG + action)).showModal();
          });
      }
    })

    .declareMethod("addVideo", function (my_video_id, my_element) {
      var gadget = this,
        dict = gadget.property_dict,
        video_dict = dict.search_result_dict[my_video_id];

      // undo = unflag for adding
      if (dict.buffer_dict[my_video_id]) {      
        setButtonIcon(my_element, ADD);
        unsetOverlay(getVideo(dict.search_results, my_video_id), LISTED);
        delete dict.buffer_dict[my_video_id];
      } else {
        setButtonIcon(my_element, UNDO);
        setOverlay(getVideo(dict.search_results, my_video_id), LISTED);

        // put up for storing
        dict.buffer_dict[video_dict.id.videoId] =
          gadget.frube_put(video_dict.id.videoId, {
            "id": video_dict.id.videoId,
            "type": video_dict.id.kind,
            "original_title": video_dict.snippet.title,
            "original_artist": '',
            "original_cover": video_dict.snippet.thumbnails.medium.url,
            "custom_title": '',
            "custom_artist": '',
            "custom_album": '',
            "custom_cover": '',
            "timestamp": new Date().getTime(),
            "pos": 0
          });
      }
      return;
    })

    .declareMethod("refreshPlaylist", function () {
      var gadget = this,
        dict = gadget.property_dict,
        temp = gadget.template_dict,
        play = gadget.state.play,
        query = gadget.element.querySelector(FILTER_INPUT).value;

      // list of ids currently displayed, used to get next/prev/random/filter
      dict.queue_list = [];

      return new RSVP.Queue()
        .push(function () {

          // clears flag to add/remove promises which have not been undone
          return RSVP.all(setBufferList(dict.buffer_dict));
        })  
        .push(function () {
          dict.buffer_dict = {};
          return gadget.frube_allDocs({"include_docs": true});
        })
        .push(function (my_response) {
          var response = my_response.data.rows.map(function (item) {
            var find = item.doc.original_title.toLowerCase();

            // filter playlist
            if (query !== STR && find.indexOf(query.toLowerCase()) === -1) {
              return;
            }
            item.doc.id = item.doc.id || item.id;
            return item.doc;
          }).filter(Boolean).sort(dynamicSort("-pos")),
          len = my_response.data.total_rows,
          html_content;

          response.forEach(function (doc, pos) {
            dict.queue_list.push(doc.id);
            html_content += temp.queue_entry_template.supplant({
              "video_id": doc.id,
              "title": setArtistAndTitle(doc),
              "thumbnail_url": doc.custom_cover || doc.original_cover,
              "pos": doc.pos,
              "disable_first": pos === 0 ? DISABLED : STR,
              "disable_last": pos === len - 1 ? DISABLED : STR,
              "overlay": play === doc.id ? (OVERLAY + SPC + PLAYING) : STR
            });
          });

          setDom(gadget.property_dict.playlist, html_content, true);
        });
    })

    .declareMethod("refreshSearchResults", function () {
      var gadget = this,
        dict = gadget.property_dict,
        catalog = dict.search_result_dict,
        list = dict.queue_list,
        response = "",
        item_id,
        item,
        video_id;

      for (item_id in catalog) {
        if (catalog.hasOwnProperty(item_id)) {
          item = catalog[item_id];
          video_id = item.id.videoId;
          response += gadget.template_dict.search_entry_template.supplant({
            "video_id": video_id,
            "title": item.snippet.title,
            "thumbnail_url": item.snippet.thumbnails.medium.url,
            "overlay": list.indexOf(video_id) > -1 ? (OVERLAY + SPC + LISTED) : STR
          });
        }
      }
      setDom(dict.search_results, response, true);
    })

    .declareMethod("jumpVideo", function (my_jump) {
      var gadget = this,
        dict = gadget.property_dict,
        jump = gadget.element.querySelector(SHUFFLE).checked ? null : my_jump;

      return new RSVP.Queue()
        .push(function () {
          return gadget.changeState({
            "play": getVideoId(dict.queue_list, gadget.state.play, jump)
          });
        })
        .push(function () {
          return RSVP.all([
            gadget.refreshPlaylist(),
            gadget.updateSlider()
          ]);
        });
    })

    .declareMethod("updateSlider", function () {
      var gadget = this,
        state = gadget.state,
        dict = gadget.property_dict,
        player = dict.player,
        slider = dict.video_slider;

      if (state.mode === WATCHING) {
        return;
      }
      if (state.slider_in_use || !slider.MaterialSlider) {
        return;
      }
      if (!player || !player.getCurrentTime) {
        return;
      }
      slider.MaterialSlider.change(player.getCurrentTime());
    })

    .declareMethod("connectAndSyncWithDropbox", function(my_event) {
      var gadget = this,
        dict = gadget.property_dict;

      return new RSVP.Queue()
        .push(function () {
          return gadget.getDeclaredGadget("dropbox");
        })
        .push(function (my_dropbox_gadget) {
          return my_dropbox_gadget.setDropboxConnect(dict.dropbox_id);
        })
        .push(function (my_ouath_dict) {
          return gadget.frube_create({
            "type": "replicate",
            "check_local_modification": true,
            "check_local_creation": true,
            "check_local_deletion": true,
            "local_sub_storage": {
              "type": "query",
              "sub_storage": {
                "type": "indexeddb",
                "database": "frube"
              }
            },
            "remote_sub_storage": {
              "type": "query",
              "sub_storage": {
                "type": "drivetojiomapping",
                "sub_storage": {
                  "type": "dropbox",
                  "access_token": my_ouath_dict.access_token,
                  "root": "sandbox"
                }
              }
            }
          });
        })
        .push(function () {
          my_event.target.querySelector("i").textContent = "done";
          dict.sync_button.querySelector("i").textContent = "sync";
          return gadget.frube_repair();
        });
    })

    .declareMethod("enterSearch", function () {
      var gadget = this;
      if (gadget.state.mode === SEARCHING) {
        return;
      }
      return gadget.changeState({"mode": SEARCHING});
    })

    .declareMethod("exitSearch", function () {
      var gadget = this;
      if (gadget.state.mode === WATCHING) {
        return;
      }
      return gadget.changeState({"mode": WATCHING});
    })

    .declareMethod("triggerSearchFromScroll", function (my_event) {
      var gadget = this,
        state = gadget.state,
        main = event.target,
        main_pos = main.scrollTop,
        height_trigger,
        sec_trigger;

      if (state.mode === SEARCHING) {
        if (main_pos >= state.last_main_pos) {
          return new RSVP.Queue()
            .push(function () {
              return gadget.changeState({"last_main_pos": main_pos});
            })
            .push(function () {
              height_trigger = main_pos + main.clientHeight + state.scroll_trigger;
              if (height_trigger >= main.scrollHeight) {
                sec_trigger = getTimeStamp() - state.search_time > state.scroll_buffer;

                if (!state.is_searching && sec_trigger) {
                  return RSVP.all([
                    gadget.enterSearch(),
                    gadget.runSearch(true, true)
                  ]);
                }

              }
            });
        }      
      }
    })

    .declareMethod("updateFileInput", function (my_event) {
      var element = this.element;
      return new RSVP.Queue()
        .push(function () {
          return resizeFileToBase64(my_event.target.files[0]);
        })
        .push(function (blob) {
          getElem(element, '.frube-edit-custom-cover-image').src =
            getElem(element, '.frube-edit-custom-cover-input').value = blob;
          my_event.target.previousElementSibling.textContent = DELETE;
        });
    })

    .declareMethod("bufferInput", function (my_event, my_trigger) {
      var gadget = this,
        target = event.target,
        is_search = my_trigger === SEARCH;

      // empty filter clears all filters, let it pass
      if (target.value.length === 0 && is_search) {
        return gadget.exitSearch();
      }

      return new RSVP.Queue()
        .push(function () {
          var promise_list = [
            gadget.changeState({"last_key_stroke": getTimeStamp()}),
            RSVP.delay(gadget.state.search_buffer)
          ];
          if (is_search) {
            promise_list.push(gadget.enterSearch());
          }
          return RSVP.all(promise_list);
        })
        .push(function () {
          if (is_search) {
            return gadget.runSearch();
          }
          return gadget.refreshPlaylist();
        });
    })

    .declareMethod("runSearch", function (my_no_delay, my_next_page) {
      var gadget = this,
        dict = gadget.property_dict,
        state = gadget.state,
        time = getTimeStamp();

      if (!my_no_delay && time - state.last_key_stroke < state.search_buffer) {
        return gadget.changeState({"is_searching": false});
      }
      if (state.is_searching) {
        return gadget.changeState({"is_searching": false});
      }

      // blank index unless loading more or coming from deeplink
      if (!my_next_page || Object.keys(dict.search_result_dict).length === 1) {
        dict.search_result_dict = {};
      }

      return new RSVP.Queue()
        .push(function () {
          return gadget.enterSearch();
        })
        .push(function () {
          return gadget.changeState({
            "is_searching": true,
            "search_time": time
          });
        })
        .push(function () {
          var search_input = gadget.element.querySelector(SEARCH_INPUT),
            token = STR;
          if (my_next_page && gadget.state.next_page_token) {
            token = gadget.state.next_page_token;
          }
          return gadget.tube_allDocs({
            "query": search_input.value,
            "token": token
          });
        })
        .push(function (response) {
          var item,
            i;
          if (response.data.total_rows > 0) {
            response.nextPageToken = response.data.rows.nextPageToken;
          }

          // XXX memory storage?
          for (i = 0; i < response.data.total_rows; i += 1) {
            item = response.data.rows[i];
            dict.search_result_dict[item.id.videoId] = item;
          }
          return RSVP.all([
            gadget.refreshSearchResults(),
            gadget.changeState({"next_page_token": response.nextPageToken}),
            gadget.changeState({"is_searching": false})
          ]);
        })
        .push(undefined, function (error) {
          if (error.type === FORBIDDEN && error.detail === QUOTA) {
            dict.error_status.textContent = ERR_QUOTA;
            dict.error_status.classList.remove(HIDDEN);
            getElem(gadget.element, '.frube-dialog-configure').showModal();
            return;
          }
          return new RSVP.Queue()
            .push(function () {
              return gadget.changeState({"is_searching": false});
            });
            // XXX can't throw from here, requests fail often with 403
            //.push(function () {
            //  throw error;
            //});
        });
    })

    /////////////////////////////
    // declared jobs
    /////////////////////////////

    // onLoop broken
    .declareJob("loopSlider", function () {
      var gadget = this;
      return new RSVP.Queue()
        .push(function () {
          return RSVP.delay(gadget.state.slider_interval);
        })
        .push(function () {
          return gadget.updateSlider();
        })
        .push(function () {
          return gadget.loopSlider();
        });
    })

    /////////////////////////////
    // declared service
    /////////////////////////////
    .declareService(function () {
      var gadget = this;

      function isHash() {
        var video_id = getVideoHash();
        if (video_id) {
          return gadget.loadVideo(video_id);
        }
      }

      function isScroll(event) {
        return gadget.triggerSearchFromScroll(event);
      }

      return RSVP.all([
        loopEventListener(window, "hashchange", false, isHash),
        loopEventListener(gadget.property_dict.main, "scroll", false, isScroll)
      ]);
    })

    /////////////////////////////
    // on state change
    /////////////////////////////
    .onStateChange(function (modification_dict) {
      var gadget = this,
        dict = gadget.property_dict,
        queue;

      if (!gadget.state.play) {
        dict.video_controller.classList.add(HIDDEN);
      } else {
        dict.video_controller.classList.remove(HIDDEN);
      }

      if (modification_dict.hasOwnProperty("play")) {
        queue = new RSVP.Queue();
        if (gadget.state.mode === WATCHING) {
          queue.push(gadget.exitSearch());
        } else {
          dict.video_controller.classList.remove(HIDDEN);
        }
        return queue
          .push(function () {
            var video_hash = getVideoHash();
            if (modification_dict.play === video_hash) {
              return gadget.loadVideo(video_hash);
            }
            setVideoHash(modification_dict.play);
            return gadget.refreshPlaylist();
          });
      }

      // switch between search and playlist mode
      if (modification_dict.hasOwnProperty("mode")) {
        if (modification_dict.mode === SEARCHING) {
          setButtonIcon(dict.action_container, PLAY);
          dict.playlist_menu.classList.add(HIDDEN);
          dict.playlist.classList.add(HIDDEN);
          dict.player_container.classList.add(HIDDEN);
          dict.player_controller.classList.remove(HIDDEN);
          dict.search_results.classList.remove(HIDDEN);
        } else {
          setButtonIcon(dict.action_container, SEARCH);
          dict.playlist_menu.classList.remove(HIDDEN);
          dict.playlist.classList.remove(HIDDEN);
          dict.search_results.classList.add(HIDDEN);
          dict.player_controller.classList.add(HIDDEN);
          dict.player_container.classList.remove(HIDDEN);
          return gadget.refreshPlaylist();
        }
      }
      return;
    })

    /////////////////////////////
    // on Event
    /////////////////////////////
    .onEvent("change", function (event) {
      var target = event.target;

      if (target.classList.contains(SLIDER)) {
        this.property_dict.player.seekTo(target.value, true);
        return;
      }

      if (target.classList.contains(UPLOAD)) {
        return this.updateFileInput(event);
      }
    }, false, false)
    
    .onEvent("mouseDown", function (event) {
      if (event.target.id === IS_SLIDER) {
        return this.changeState({"slider_in_use": true});
      }
    }, false, false)
    
    .onEvent("mouseUp", function (event) {
      if (event.target.id === IS_SLIDER) {
        return this.changeState({"slider_in_use": false});
      }
    }, false, false)

    .onEvent("input", function (event) {
      var gadget = this;

      switch (event.target.getAttribute("name")) {
        case "frube-search-input":
          return gadget.bufferInput(event, SEARCH); 
        case "frube-filter-input":
          return gadget.bufferInput(event, FILTER);
      }
    }, false, false)

    // clickediclick
    .onEvent("click", function (event) {
      var gadget = this,
        target = event.target,
        video_id = target.getAttribute(ID),
        bad_indicator,
        element;

      if (video_id) {
        return gadget.changeState({"play": video_id});
      }
      switch (target.getAttribute(NAME)) {
        case "frube-connector-dropbox":
          return gadget.connectAndSyncWithDropbox(event);
        case "frube-view-switch":
          return gadget.changeState({
            "mode": gadget.state.mode === SEARCHING ? WATCHING : SEARCHING
          });
        case "frube-upload":
          bad_indicator = target.previousElementSibling;
          element = gadget.element;
          if (bad_indicator.textContent === DELETE) {
            bad_indicator.textContent = ATTACH;
            getElem(element, '.frube-edit-custom-cover-image').src = PLACEHOLDER;
            getElem(element, '.frube-edit-custom-cover-input').value = '';
            event.preventDefault();
            return false;
          }
      }
    }, false, false)

    .onEvent("submit", function (event) {
      var gadget = this;

      switch (event.target.getAttribute(NAME)) {
        case "frube-playlist-remove":
          return gadget.removeVideo(getAttr(event, ID), event.target);
        case "frube-playlist-add":
          return gadget.addVideo(getAttr(event, ID), event.target);
        case "frube-playlist-front":
          return gadget.changeRank(getAttr(event, ID), getAttr(event, POS), 1);
        case "frube-playlist-back":
          return gadget.changeRank(getAttr(event, ID), getAttr(event, POS), -1);
        case "frube-playlist-edit":
          return gadget.editVideo(event, getAttr(event, ID));
        case "frube-playlist-play":
          return gadget.changeState({"play": getAttr(event, ID)});
        case "frube-playlist-next":
          return gadget.jumpVideo(1);
        case "frube-playlist-previous":
          return gadget.jumpVideo(-1);
        case "frube-filter-source":
          return gadget.refreshPlaylist();
        case "frube-search-source":
          return gadget.runSearch(true);
        case "frube-dialog":
          return gadget.handleDialog(event);
        case "frube-playlist-undo":
          delete gadget.property_dict.buffer_dict[getAttr(event, ID)];
          break;
        case "frube-play-pause":
          playOrPause(gadget.property_dict.player);
          break;
        case "frube-set-volume":
          setVolume(gadget.property_dict.player, event);
          break;
        case "frube-home":
          gadget.property_dict.main.scrollTop = 0;
          break;
      }
    }, false, true);

}(window, rJS, jIO, RSVP, YT, JSON, FormData, URL, loopEventListener, Math));

