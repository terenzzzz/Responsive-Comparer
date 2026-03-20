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

function getFallbackUrl() {
  return normalizeInputUrl($('#url-input').val() || defaultURL);
}

function rememberFrameUrl($iframe, url) {
  var normalizedUrl = normalizeInputUrl(url);
  if (normalizedUrl) {
    $iframe.data('current-url', normalizedUrl);
  }
  return normalizedUrl;
}

function getFrameUrl($frame) {
  var $iframe = $frame.find('iframe');
  var url = '';

  try {
    url = $iframe.contents().get(0).location.href;
  } catch (e) {
    url = $iframe.data('current-url') || '';
  }

  return normalizeInputUrl(url || getFallbackUrl());
}

function loadIframe($iframe, url) {
  var normalizedUrl = rememberFrameUrl($iframe, url);
  if (!normalizedUrl) return;
  $iframe.data('loaded', false);
  showLoader($iframe.closest('.frame').attr('id'));
  $iframe.get(0).src = normalizedUrl;
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
    rememberFrameUrl($(this), url);
    this.src = url;
  });
}

$('.frame').each(function(){showLoader($(this).attr('id'))});

var suppressIframeSyncUntil = 0;

function suppressIframeSyncFor(ms) {
  suppressIframeSyncUntil = Date.now() + ms;
}

function shouldSuppressIframeSync() {
  return Date.now() < suppressIframeSyncUntil;
}

function isFrameReordering() {
  return frameDragState.dragging || shouldSuppressIframeSync();
}


//when document loads
function onIframeLoad() {
  var $this = $(this);
  var url = '';
  var error = false;

  try {
    url = $this.contents().get(0).location.href;
    rememberFrameUrl($this, url);
  } catch (e) {
    error = true;
    url = $this.data('current-url') || getFallbackUrl();
  }

  if (isFrameReordering()) {
    hideLoader($this.closest('.frame').attr('id'));
    $this.data('loaded', true);
    updateScaling();
    return;
  }

  //load other pages with the same URL
  if (allLoaded()) {
    if (error) {
      hideLoader($this.closest('.frame').attr('id'));
      $this.data('loaded', true);
      updateScaling();
      return;
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
function getFramesAvailableHeight() {
  var $frames = $('#frames');
  var framesStyles = window.getComputedStyle($frames.get(0));
  var paddingTop = parseFloat(framesStyles.paddingTop || 0) || 0;
  var paddingBottom = parseFloat(framesStyles.paddingBottom || 0) || 0;
  var topBarHeight = $('#url').outerHeight(true) || 0;
  var footerHeight = $('#footer').outerHeight(true) || 0;
  var viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

  return Math.max(0, viewportHeight - topBarHeight - footerHeight - paddingTop - paddingBottom);
}

function updateRowHeights() {
  var $inner = $('#inner');
  var $rows = $inner.children('.frame-row');

  if (!$rows.length) return;

  var styles = window.getComputedStyle($inner.get(0));
  var gap = parseFloat(styles.rowGap || styles.gap || 0) || 0;
  var rowCount = $rows.length;
  var availableHeight = getFramesAvailableHeight();
  var rowHeight = availableHeight;
  var totalHeight = rowCount > 0 ? rowHeight * rowCount + gap * (rowCount - 1) : availableHeight;

  $inner.css('height', totalHeight + 'px');
  $rows.css('height', rowHeight + 'px');
}

function updateRowWidths() {
  $('#inner .frame-row').each(function() {
    var $row = $(this);
    var $frames = $row.children('.frame');
    var frameCount = $frames.length;

    if (!frameCount) return;

    var rowStyles = window.getComputedStyle(this);
    var gap = parseFloat(rowStyles.columnGap || rowStyles.gap || 0) || 0;
    var availableWidth = Math.max(0, $row.innerWidth() - gap * (frameCount - 1));
    var totalTargetWidth = 0;

    $frames.each(function() {
      totalTargetWidth += parseInt($(this).find('iframe').attr('width'), 10) || 0;
    });

    var scale = totalTargetWidth > 0 ? Math.min(1, availableWidth / totalTargetWidth) : 1;

    $frames.each(function() {
      var targetWidth = parseInt($(this).find('iframe').attr('width'), 10) || 0;
      var computedWidth = Math.max(0, targetWidth * scale);
      $(this).css({
        'flex': '0 0 ' + computedWidth + 'px',
        'width': computedWidth + 'px',
        'min-width': computedWidth + 'px',
        'max-width': targetWidth + 'px'
      });
    });
  });
}

function updateScaling() {
  updateRowHeights();
  updateRowWidths();
  $('.frame').each(function() {
    var $frame = $(this);
    var $iframe = $frame.find('iframe');
    var containerWidth = $frame.width();
    var targetWidth = parseInt($iframe.attr('width'));
    if (containerWidth && targetWidth) {
      var scale = Math.min(1, containerWidth / targetWidth);

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

function getOrderedFrames() {
  return $('#inner .frame').toArray();
}

function regroupFrames(orderedFrames) {
  var frames = orderedFrames || getOrderedFrames();
  var $inner = $('#inner');
  var requiredRowCount = Math.ceil(frames.length / 4);

  while ($inner.children('.frame-row').length < requiredRowCount) {
    $inner.append('<div class="frame-row"></div>');
  }

  $inner.children('.frame-row').each(function(rowIndex) {
    var rowEl = this;
    var expectedFrames = frames.slice(rowIndex * 4, rowIndex * 4 + 4);

    if (!expectedFrames.length) {
      $(rowEl).remove();
      return;
    }

    for (var i = 0; i < expectedFrames.length; i++) {
      var expectedFrame = expectedFrames[i];
      var currentFrameAtPosition = rowEl.children[i];
      if (currentFrameAtPosition !== expectedFrame) {
        rowEl.insertBefore(expectedFrame, currentFrameAtPosition || null);
      }
    }
  });

  $inner.children('.frame-row').slice(requiredRowCount).remove();
}

function getDragTargetIndex(clientX, clientY) {
  var draggedEl = frameDragState.$frame && frameDragState.$frame.get(0);
  var frames = getOrderedFrames().filter(function(frameEl) {
    return frameEl !== draggedEl;
  });

  for (var i = 0; i < frames.length; i++) {
    var rect = frames[i].getBoundingClientRect();
    var isBeforeThisRow = clientY < rect.top;
    var isWithinThisRow = clientY >= rect.top && clientY <= rect.bottom;
    var isBeforeFrameMidpoint = clientX < rect.left + rect.width / 2;

    if (isBeforeThisRow || (isWithinThisRow && isBeforeFrameMidpoint)) {
      return i;
    }
  }

  return frames.length;
}

var frameDragState = {
  $frame: null,
  handleEl: null,
  pointerId: null,
  startX: 0,
  startY: 0,
  startIndex: -1,
  targetIndex: -1,
  dragging: false
};

var FRAME_DRAG_MOVE_TOLERANCE = 8;

function resetFrameDragState() {
  if (frameDragState.$frame) {
    frameDragState.$frame.removeClass('is-drag-ready is-dragging');
    frameDragState.$frame.css('transform', '');
  }
  $('body').removeClass('frame-dragging');
  frameDragState.handleEl = null;
  frameDragState.$frame = null;
  frameDragState.pointerId = null;
  frameDragState.startX = 0;
  frameDragState.startY = 0;
  frameDragState.startIndex = -1;
  frameDragState.targetIndex = -1;
  frameDragState.dragging = false;
}

function updateDraggedFramePosition(clientX, clientY) {
  if (!frameDragState.$frame || !frameDragState.dragging) return;

  var deltaX = clientX - frameDragState.startX;
  var deltaY = clientY - frameDragState.startY;

  frameDragState.$frame.css('transform', 'translate3d(' + deltaX + 'px, ' + deltaY + 'px, 0)');
}

function beginFrameDrag() {
  if (!frameDragState.$frame || !frameDragState.$frame.length) return;
  suppressIframeSyncFor(10000);
  frameDragState.dragging = true;
  frameDragState.$frame.removeClass('is-drag-ready').addClass('is-dragging');
  $('body').addClass('frame-dragging');
  if (frameDragState.handleEl && frameDragState.handleEl.setPointerCapture) {
    frameDragState.handleEl.setPointerCapture(frameDragState.pointerId);
  }
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
          <span class="frame-title">
            <span class="drag-hint" title="Drag to reorder">
              <span class="drag-handle" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" /></svg>
              </span>
            </span>
            <span>${width}</span>
          </span>
          <div class="loader"></div>
          <div class="frame-actions">
            <button class="btn-icon btn-refresh" title="Refresh Frame" aria-label="Refresh Frame">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15.55-6.36L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15.55 6.36L3 16" /></svg>
            </button>
            <button class="btn-icon btn-open-external" title="Open In New Tab" aria-label="Open In New Tab">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3h7v7" /><path d="M10 14 21 3" /><path d="M21 14v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h4" /></svg>
            </button>
            <button class="btn-delete btn-icon" title="Delete Frame" aria-label="Delete Frame">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </h2>
        <div class="iframe-container">
          <iframe sandbox="allow-same-origin allow-forms allow-scripts" seamless width="${width}"></iframe>
        </div>
      </div>
    `;

    var $newFrame = $(frameHtml);
    var $lastRow = $('#inner .frame-row').last();
    if ($lastRow.length && $lastRow.children('.frame').length < 4) {
      $lastRow.append($newFrame);
    } else {
      $('#inner').append($('<div class="frame-row"></div>').append($newFrame));
    }
    var $newIframe = $newFrame.find('iframe');

    // Bind load event to new iframe using the unified handler
    $newIframe.on('load', onIframeLoad);

    // Use unified loadPage logic to load the current URL into the new frame
    var currentUrl = $('#url-input').val() || defaultURL;
    // Load the URL into the newly created iframe as well
    loadIframe($newIframe, currentUrl);

    // Clear input
    $('#custom-width').val('');

    // Update scaling for all
    regroupFrames();
    updateScaling();
  });

  // Delete frame logic (using delegation)
  $(document).on('click', '.btn-delete', function() {
    if ($('.frame').length <= 1) {
      alert('You must have at least one frame.');
      return;
    }
    $(this).closest('.frame').remove();
    regroupFrames();
    updateScaling();
  });

  $(document).on('click', '.btn-refresh', function() {
    var $frame = $(this).closest('.frame');
    loadIframe($frame.find('iframe'), getFrameUrl($frame));
  });

  $(document).on('click', '.btn-open-external', function() {
    var url = getFrameUrl($(this).closest('.frame'));
    window.open(url, '_blank', 'noopener,noreferrer');
  });

  $(document).on('pointerdown', '.frame h2', function(e) {
    if ($(e.target).closest('.frame-actions').length || e.button !== 0) {
      return;
    }

    resetFrameDragState();

    frameDragState.$frame = $(this).closest('.frame');
    frameDragState.handleEl = this;
    frameDragState.pointerId = e.pointerId;
    frameDragState.startX = e.clientX;
    frameDragState.startY = e.clientY;
    frameDragState.startIndex = getOrderedFrames().indexOf(frameDragState.$frame.get(0));
    frameDragState.targetIndex = frameDragState.startIndex;
    frameDragState.$frame.addClass('is-drag-ready');
    beginFrameDrag();
  });

  $(document).on('pointermove', function(e) {
    if (!frameDragState.$frame || frameDragState.pointerId !== e.pointerId) {
      return;
    }

    var movedX = Math.abs(e.clientX - frameDragState.startX);
    var movedY = Math.abs(e.clientY - frameDragState.startY);

    if (!frameDragState.dragging) {
      if (movedX > FRAME_DRAG_MOVE_TOLERANCE || movedY > FRAME_DRAG_MOVE_TOLERANCE) {
        resetFrameDragState();
      }
      return;
    }

    e.preventDefault();
    updateDraggedFramePosition(e.clientX, e.clientY);
    if (movedX > FRAME_DRAG_MOVE_TOLERANCE || movedY > FRAME_DRAG_MOVE_TOLERANCE) {
      frameDragState.targetIndex = getDragTargetIndex(e.clientX, e.clientY);
    }
  });

  $(document).on('pointerup pointercancel', function(e) {
    if (frameDragState.pointerId !== e.pointerId) {
      return;
    }

    var wasDragging = frameDragState.dragging;
    var startIndex = frameDragState.startIndex;
    var targetIndex = frameDragState.targetIndex;
    var draggedEl = frameDragState.$frame && frameDragState.$frame.get(0);
    resetFrameDragState();

    if (wasDragging) {
      suppressIframeSyncFor(2000);
    }

    if (wasDragging && draggedEl && startIndex !== targetIndex && targetIndex >= 0) {
      var orderedFrames = getOrderedFrames().filter(function(frameEl) {
        return frameEl !== draggedEl;
      });
      orderedFrames.splice(targetIndex, 0, draggedEl);
      regroupFrames(orderedFrames);
    }

    if (wasDragging) {
      updateScaling();
    }
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

  regroupFrames();

});
