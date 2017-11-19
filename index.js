/*jslint maxlen: 80, indent: 2 */
/*global window, rJS, RSVP */
(function (window, rJS, RSVP) {
  "use strict";

  /////////////////////////////
  // parameters
  /////////////////////////////
  var OPTION_DICT = {
    "youtube_id": "AIzaSyD_ZX5na0fPbcLbO5sZ2hWD-FxR-Xd2_TM",
    "dropbox_id": "rz2ua0dyty5lxx7"
  };

  rJS(window)

    /////////////////////////////
    // declared service
    /////////////////////////////
    .declareService(function () {
      var gadget = this;
      return gadget.getDeclaredGadget("frube")
        .push(function (my_frube_gadget) {
          return my_frube_gadget.render(OPTION_DICT);
        })
        .push(null, function (my_error) {
          console.log(my_error);
          throw my_error;
        });
    });

}(window, rJS, RSVP));