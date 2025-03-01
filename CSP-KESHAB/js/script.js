let slideIndex = 0;
showSlides();

function showSlides() {
  let i;
  let slides = document.getElementsByClassName("mySlides");
  let dots = document.getElementsByClassName("dot");
  for (i = 0; i < slides.length; i++) {
    slides[i].style.display = "none";  
  }
  slideIndex++;
  if (slideIndex > slides.length) {slideIndex = 1}    
  for (i = 0; i < dots.length; i++) {
    dots[i].className = dots[i].className.replace(" active", "");
  }
  slides[slideIndex-1].style.display = "block";  
  dots[slideIndex-1].className += " active";
  setTimeout(showSlides, 5000); // Change image every 2 seconds
}
/* carousel start */

$(document).ready(function(){
  $(".owl-carousel").owlCarousel({
      items:2, // Number of items to display
      loop: true, // Loop back to the start
      margin: 10, // Space between items
      nav: true, // Show navigation buttons
      dots: true, // Show dots
      autoplay: true, // Enable autoplay
      autoplayTimeout: 3000, // Time between transitions
      autoplayHoverPause: true // Pause on hover
  });
});

/* COUNTER UP*/
function animateCounters() { 
  const counters = 
      document 
          .querySelectorAll(".counter"); 
  counters 
      .forEach((counter, index) => { 
          const target = 
              parseInt(counter 
                  .getAttribute( 
                      "data-target") 
              ); 
          const duration = 2000; 
          const step = 
              Math.ceil( 
                  (target / duration) *5 
              ); 
          let current = 0; 

          const updateCounter = () => { 
              current += step; 
              if (current <= target) { 
                  counter 
                      .innerText = current; 
                  requestAnimationFrame(updateCounter); 
              } else { 
                  counter.innerText = target; 
              } 
          }; 

          setTimeout(() => { 
              updateCounter(); 
          }, index * 1000); 
          // Delay each counter by 1 second 
      }); 
} 

animateCounters();