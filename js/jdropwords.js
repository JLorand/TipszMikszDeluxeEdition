jQuery.fn.jDropWords = function(options) {

  // Default settings.
  var defaults = {
    hoverClass : "drop-hover",
    droppedClass : "dropped",
    errorClass : "error",
    successClass : "success",
    beforeDrop : null,
    afterDrop : null,
    afterCorrection : null,
    submitAjax : false,
    submitAjaxUrl : "",
    submitAjaxExtraParams : {},
    feedbacks : {
      50 : "Low score, please try again.",
      80 : "Not perfect, but good.",
      100 : "Bravo ! You nailed it."
    },
    answers : null
  };

  var settings = $.extend( {}, defaults, options );

 
  function dropElement(srcElt, targetElt) {
    // Removes droppable.
    srcElt.draggable( "disable" );
    //srcElt.prepend(targetElt);
    var droppedElt = getDroppedElement(srcElt);
    droppedElt.prependTo(targetElt);
    targetElt.addClass("active");
    srcElt.hide();
  }

  
  function getDroppedElement(srcElt) {
    var html = '<div class="' + settings.droppedClass + ' clearfix" rel="' + srcElt.attr('id') + '">' +
      '<span>' + srcElt.html() + '</span>' +
      '<div class="action"><a href="#" class="close">x</a></div>' +
      '</div>';
    var container = $(html);
    $('a', container).click(function() {
      container.parent().removeClass('active');
      resetDraggableElement(srcElt);
      container.remove();
    });
    return container;
  }

  
  function onDrop ( event, ui ) {
    // Before drop callback.
    if (settings.beforeDrop && jQuery.isFunction(settings.beforeDrop)) {
      settings.beforeDrop(event, ui);
    }
    dropElement($('.ui-draggable-dragging'), $(this));

   
    if (settings.onDrop && jQuery.isFunction(settings.onDrop)) {
      settings.afterDrop(event, ui);
    }
  }

  
  function resetDraggableElement(elt) {
    elt.show();
    elt.draggable( "enable" );
  }


  
  function reset(appContainer) {
    $( ".word", appContainer).each(function() {
      $(this).draggable( "disable" );
      resetDraggableElement($(this));
    });
    $( ".blank", appContainer).html("");
    $( ".blank", appContainer).removeClass("active");
    $('.blanks p .blank', appContainer)
      .removeClass('error')
      .removeClass('success');
    $('.feedback', appContainer).remove();
    $('.overlay', appContainer).remove();
    // Reactivate submit button.
    $(".submit", appContainer).removeAttr("disabled");
  }

  
  function init(appContainer) {
    $( ".word", appContainer).draggable({
      containment: appContainer,
      revert: true
    });

    // Check size of the biggest sentence.
    var maxWidth = 0;
    $( ".word", appContainer).each(function() {
      var eltWidth = $(this).width();
      if (eltWidth > maxWidth) {
        maxWidth = eltWidth;
      }
    });

    $( ".blank", appContainer).each(function() {
      initBlank($(this));
      // Adjust size of the blanks to match the maximum word.
      $(this).width(maxWidth);
    });

    $(".submit", appContainer).click(function() {
      // If button is disabled, do not process.
      if ($(this).attr("disabled") == "disabled") {
        return false;
      }
      // Else, perform correction.
      doCorrection(appContainer);
    });

    $(".reset", appContainer).click(function() {
      // If button is disabled, do not process.
      if ($(this).attr("disabled") == "disabled") {
        return false;
      }
      // Else, perform reset.
      reset(appContainer);
    });
  }

  
  function initBlank(blankElt) {
    blankElt.droppable({
      drop: onDrop,
      hoverClass: settings.hoverClass
    });
  }

  
  function doCorrection(appContainer) {
    var answers = settings.answers;
    // If answers is a string, it is a url, we make a call to the server.
    if (typeof answers == 'string' || answers instanceof String) {
      $.get( answers, function( data ) {
       checkAnswers(data, appContainer);
      }, "json" );
    }
    
    else {
      checkAnswers(answers, appContainer);
    }
    $(".submit", appContainer).attr("disabled", "disabled");
  }

 
  function checkAnswers(answers, appContainer) {
    var score = 0;
    var nbQuestions = 0;
    var animUpDuration = 75;
    var animDownDuration = 100;
    var totalAnimDuration = animUpDuration + animDownDuration;
    // Delay to add before each animation starts.
    var delay = 0;

    $('.blanks p .blank', appContainer).each(function() {
      var blankId = $(this).attr("id");
      var dropped = $("." + settings.droppedClass, $(this));
      var expected = answers[blankId];
      var actual = dropped.attr("rel");
      var className = settings.errorClass;
      if (actual == expected) {
        className = settings.successClass;
        score ++;
      }

      // For all filled blanks, add a small animation before adding the class.
      // Up and Down animation. The color is added after the element goes up,
      // and before it goes down.
      var blank = $(this);
      if (dropped.length) {
        var posTop = parseInt(dropped.css('top'));
        dropped
          .delay(delay)
          .animate({'top': (posTop - 7) + "px"},
          {
            duration : 75,
            queue : true,
            complete : function() {
              blank.addClass(className);
            }
          }
        )
          .animate({'top': posTop + "px"}, {duration : 100, queue : true});
        delay += totalAnimDuration;
      }
      else {
        $(this).addClass(className);
      }
      nbQuestions++;
    });

   
    setTimeout(function() {
        displayScore(appContainer, score, nbQuestions);
    },
    delay + totalAnimDuration);
    blockApp(appContainer);

    
    if (settings.afterCorrection && jQuery.isFunction(settings.afterCorrection)) {
      settings.afterCorrection(score, nbQuestions);
    }

    
    if (settings.submitAjax) {
      var postParams = {
        score : score,
        nbqst : nbQuestions
      }
      postParams = $.extend( {}, postParams, settings.submitAjaxExtraParams );
      $.post(settings.submitAjaxUrl, postParams);
    }
  }

  
  function displayScore(appContainer, score, nbQst) {
    // Get score element.
    var scoreHtml = getScoreElement();
    var scoreElt = $(scoreHtml);
    appContainer.prepend(scoreElt);
    scoreElt.show();

    var percent = Math.round(score / nbQst * 100);
    var feedbackText = null;
    for (i in settings.feedbacks) {
      if (percent <= i) {
        feedbackText = settings.feedbacks[i];
        break;
      }
    }
    drawCircle(35, 35, score + "/" + nbQst, function() {
      $(".feedback p").text(feedbackText);
    });
  }

  function blockApp(appContainer) {
    $('.words', appContainer).prepend('<div class="overlay"></div>');
    $('.blanks', appContainer).prepend('<div class="overlay"></div>');
  }


  function getScoreElement() {
    var html = '<div class="feedback clearfix" style="display: none;">' +
      '<p></p>' +
      '<div class="score">' +
        '<canvas id="score-canvas" width="70" height="70"></canvas>' +
      '</div>' +
    '</div>';
    return html;
  }

  
  function drawCircle(x, y, text, callback) {
    var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
    window.requestAnimationFrame = requestAnimationFrame;

    var canvas = document.getElementById('score-canvas');
    var context = canvas.getContext('2d');
    var circles = [];

    var radius = 30;
    var endPercent = 101;
    var curPerc = 0;
    var counterClockwise = false;
    var circ = Math.PI * 2;
    var quart = Math.PI / 2;
    var speed = 10;

    context.lineWidth = 10;
    context.strokeStyle = '#286090';
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;

    function doText(context, x, y, text) {
      context.lineWidth = 1;
      context.fillStyle = "#000000";
      context.lineStyle = "#286090";
      context.font = "24px Arial";
      context.fillText(text, x - 17, y + 7);
    }

    function animate(current) {
      context.lineWidth = 10;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.beginPath();
      context.arc(x, y, radius, -(quart), ((circ) * current) - quart, false);
      context.stroke();
      curPerc+=speed;
      if (circles.length) {
        for (var i = 0; i < circles.length; i++) {
          context.lineWidth = 10;
          context.beginPath();
          context.arc(circles[i].x, circles[i].y, radius, -(quart), ((circ) * circles[i].curr) - quart, false);
          context.stroke();
          doText(context, circles[i].x, circles[i].y, circles[i].text);
        }
      }
      if (curPerc < endPercent) {

        requestAnimationFrame(function () {
          animate(curPerc / 100)
        });
      } else {
        var circle = {
          x: x,
          y: y,
          curr: current,
          text: text
        };
        circles.push(circle);
        doText(context, x, y, text);
        if (callback) callback.call();
      }
    }
    animate();
  }

  // Init application.
  return this.each(function() {
    var appContainer = $(this);
    init(appContainer);
  });
};
