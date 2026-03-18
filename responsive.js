var defaultURL = 'www.google.com'; //<---- CHANGE TO YOUR WEBSITE URL

function normalizeInputUrl(raw) {
  if (!raw) return '';
  var url = String(raw).trim();
  if (!url) return '';
  // Allow protocol-relative URLs like //example.com/path?x=1
  if (url.indexOf('//') === 0) return window.location.protocol + url;
  // Preserve existing schemes including file://, http(s)://, about:, data:, etc.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return url;
  return 'http://' + url;
}

function getInitialUrlFromLocation() {
  // If URL is provided as ?url=..., treat EVERYTHING after "url=" as the payload.
  // This prevents truncation when the target URL itself contains "&" (common with Shopify preview links).
  var search = window.location.search || '';
  if (search.indexOf('?url=') === 0) {
    var after = search.slice('?url='.length);
    try {
      return decodeURIComponent(after);
    } catch (e0) {
      return after;
    }
  }

  // Backward-compatible: treat everything after the first "?" as the raw URL payload
  // This preserves embedded "?" and "&" by relying on location.search (not splitting href).
  if (search.length <= 1) return '';
  var payload = search.slice(1);
  // Attempt decode if user encoded it; if not encoded, keep as-is.
  try {
    return decodeURIComponent(payload);
  } catch (e2) {
    return payload;
  }
}

//show loading graphic
function showLoader(id) {
  $('#' + id + ' .loader').fadeIn('slow');
}

//hdie loading graphic
function hideLoader(id) {
  $('#' + id + ' .loader').fadeOut('slow');
}

//function to check load state of each frame
function allLoaded(){
  var results = [];
  $('iframe').each(function(){
    if(!$(this).data('loaded')){results.push(false)}
  });
  var result = (results.length > 0) ? false : true;
  return result;
};

function loadPage($frame, url) {
  url = normalizeInputUrl(url);
  $('iframe').not($frame).each(function(){showLoader($(this).parent().attr('id'));})
  $('iframe').not($frame).data('loaded', false);
  $('iframe').not($frame).each(function() {
    this.src = url;
  });
}

$('.frame').each(function(){showLoader($(this).attr('id'))});


//when document loads
function onIframeLoad() {
  var $this = $(this);
  var url = '';
  var error = false;

  try {
    url = $this.contents().get(0).location.href;
  } catch (e) {
    error = true;
    if ($('#url-input').val() != '') {
      url = $('#url-input').val();
    } else {
      url = defaultURL;
    }
  }

  //load other pages with the same URL
  if (allLoaded()) {
    if (error) {
      // If we are already on a proxy URL, don't alert just to avoid annoying the user
      if (url.indexOf('api.codetabs.com') === -1) {
        alert('Browsers prevent navigation from inside iframes across domains.\nPlease use the textbox at the top for external sites.');
        loadPage('', defaultURL);
      }
    } else {
      loadPage($this, url);
    }
  }

  //when frame loads, hide loader graphic
  else {
    error = false;
    hideLoader($(this).closest('.frame').attr('id'));
    $(this).data('loaded', true);
    updateScaling(); // Ensure scaling is correct after load
  }
}

// Function to update scaling for all iframes
function updateScaling() {
  $('.frame').each(function() {
    var $frame = $(this);
    var $iframe = $frame.find('iframe');
    var containerWidth = $frame.width();
    var targetWidth = parseInt($iframe.attr('width'));
    if (containerWidth && targetWidth) {
      var scale = containerWidth / targetWidth;

      // Calculate available height for iframe (container height - h2 height)
      var h2Height = $frame.find('h2').outerHeight();
      var availableHeight = $frame.height() - h2Height;

      // Set unscaled iframe height to fill available space after scaling
      var unscaledHeight = availableHeight / scale;

      $iframe.css({
        'transform': 'scale(' + scale + ')',
        'width': targetWidth + 'px',
        'height': unscaledHeight + 'px'
      });
    }
  });
}

//when document loads
$(document).ready(function() {

  loadPage('', defaultURL);

  // Update scaling on window resize
  $(window).resize(updateScaling);

  // Initial scaling after short delay to ensure widths are settled
  setTimeout(updateScaling, 500);

  // Add custom frame logic
  $('#add-frame').click(function() {
    var width = parseInt($('#custom-width').val());
    if (isNaN(width) || width < 100 || width > 4000) {
      alert('Please enter a valid width between 100 and 4000');
      return;
    }

    var id = 'f' + ($('.frame').length + 1);
    
    var frameHtml = `
      <div id="${id}" class="frame" style="flex: ${width};">
        <h2>
          <span>${width}</span>
          <div class="loader"></div>
          <button class="btn-delete" title="Delete Frame">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </h2>
        <div class="iframe-container">
          <iframe sandbox="allow-same-origin allow-forms allow-scripts" seamless width="${width}"></iframe>
        </div>
      </div>
    `;

    var $newFrame = $(frameHtml);
    $('#inner').append($newFrame);
    var $newIframe = $newFrame.find('iframe');

    // Bind load event to new iframe using the unified handler
    $newIframe.on('load', onIframeLoad);

    // Use unified loadPage logic to load the current URL into the new frame
    var currentUrl = $('#url-input').val() || defaultURL;
    // Load the URL into the newly created iframe as well
    $newIframe.data('loaded', false);
    showLoader($newFrame.attr('id'));
    $newIframe.get(0).src = normalizeInputUrl(currentUrl);

    // Clear input
    $('#custom-width').val('');

    // Update scaling for all
    updateScaling();
  });

  // Delete frame logic (using delegation)
  $(document).on('click', '.btn-delete', function() {
    if ($('.frame').length <= 1) {
      alert('You must have at least one frame.');
      return;
    }
    $(this).closest('.frame').remove();
    updateScaling();
  });

  //query string
  var initialUrl = getInitialUrlFromLocation();
  if (initialUrl) {
    $('#url-input').val(initialUrl);
    loadPage('', initialUrl);
  }

  //when the url textbox is used
  $('#url-form').submit(function() {
    loadPage('', $('#url-input').val());
    return false;
  });

  //when initial frames load
  $('iframe').on('load', onIframeLoad);

});
