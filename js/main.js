/**
 * Note: An external CityFinder API is important so that secret API keys (e.g., Yelp Fusion) are not 
 * exposed in this frontend code.
 */
const API_ENDPOINT = "https://volweb.utk.edu/~jyoshiok/";

/**
 * Volweb API endpoint returns GoogleAnalyticsObject script after content; remove it and convert to json.
 * Note: If the script is not included, this will simply return the original response.
 * @param data Called endpoint response data.
 * @return Endpoint response without GoogleAnalyticsObject script as a JSON object.
 */
function cleanResponse(data) {
    var cleanedResponse = data.split('<script>')[0];
    return JSON.parse(cleanedResponse);
}

/**
 * Calls the specified CityFinder endpoint.
 * @param endpoint CityFinder endpoint name.
 */
function callEndpoint(endpoint) {
    // Note: The Content-Type is 'text/html' since the endpoint automatically returns a
    // GoogleAnalyticsObject script, appended to the endpoint's json response.
    fetch(API_ENDPOINT + endpoint + ".php")
        .then((res) => res.text())
        .then((data) => console.log(cleanResponse(data)))
        .catch((err) => console.error(err));
}

/**
 * Scrolls Page to Specified Element Smoothly.
 *
 * @param target Defines which element to smoothly scroll to (".x or #x")
 * @param duration Time it should take to complete scroll animation (in milliseconds).
 */
function smoothScrollTo(target, duration)
{
  // Calculate position of target element relative to top of page taking into account
  // nav bar height and dead space.
  var elementHeight = document.querySelector(target).offsetHeight;
  var windowHeight = window.innerHeight;
  // Dead space is between the nav bar & top of element and between bottom of
  // element & bottom of browser.
  var deadSpace = windowHeight - elementHeight;
  // Subtract half of dead space to set target position with the element in the middle of the screen.
  var targetPos = document.querySelector(target).offsetTop - deadSpace/2
  
  // Position of scroll bar when animation begins.
  var startPos = window.pageYOffset;

  // Distance between start and end position.
  var distance = targetPos - startPos;

  var startTime = null;

  /**
   * Nested function used to control smooth scroll animation.
   *
   * @param currentTime Passed in from requestAnimationFrame(); defines the amount of
   *    time current page has been opened for (in milliseconds).
   */
  function scroll(currentTime)
  {
    if (startTime == null)
    {
      // If startTime has not been initialized, set as current time.
      startTime = currentTime;
    }
    // Define how long animation has been running for.
    var timeElapsed = currentTime - startTime;
    // Scroll to next position calculated by getNextPose() function.
    window.scrollTo(0, getNextPose(timeElapsed, startPos, distance, duration));
    
    if (timeElapsed < duration)
    {
      // If animation's time elapsed has not exceeded defined duration of animation,
      // initialize next frame of animation.
      requestAnimationFrame(scroll);
    }
  }

  /**
   * Nested function used to get position of next frame for smooth scroll animation.
   *
   * @param t Time elapsed of animation.
   * @param b Scroll offset from top when animation is first initialized.
   * @param x Distance between start and end position of animation.
   * @param d Duration of animation.
   *
   * @return Position of next frame for animation.
   */
  function getNextPose(t, b, x, d)
  {
    // Quadratic easing in/out formula.
    t /= d/2;
    if (t < 1)
    {
      return x/2*t*t + b;
    }
    t--;
    return -x/2 * (t*(t-2) - 1) + b;
  }

  // Initialize first frame of animation.
  requestAnimationFrame(scroll);
}