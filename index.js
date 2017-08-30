/*jslint indent: 2 */
/*global window, rJS, RSVP */
(function (window, rJS, RSVP) {
  "use strict";

  var CONFIGURATION = {};

  /////////////////////////////
  // some methods
  /////////////////////////////

  rJS(window)

    /////////////////////////////
    // ready
    /////////////////////////////
    .ready(function () {
      return this.getDeclaredGadget("frube")
        .push(function (my_frube_gadget) {
          return my_frube_gadget.render(CONFIGURATION);
        })
        .push(null, function (my_error) {
          console.log(my_error);
          throw my_error;
        });
    });

    /////////////////////////////
    // acquired methods
    /////////////////////////////
    
    /////////////////////////////
    // published methods
    /////////////////////////////

    /////////////////////////////
    // declared methods
    /////////////////////////////

    /////////////////////////////
    // declared service
    /////////////////////////////

}(window, rJS, RSVP));

