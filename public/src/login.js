$(document).ready(function(){
    $("#submit").click(function() {
      const email = $('#email').val();
      const password = $('#password').val();

      const data = {
        email,
        password,
      };

      $.ajax({
        type: "POST",
        url: '/api/v1/user/login',
        contentType: "application/json",
        data: JSON.stringify(data),
        success: function(response) {
          if(response) {
            alert("Login successful!");
            
            // Store token in localStorage for API calls
            if (response.token) {
              localStorage.setItem('authToken', response.token);
            }
            
            // Store user info
            if (response.user) {
              localStorage.setItem('user', JSON.stringify(response.user));
            }
            
            // Redirect based on role
            if (response.user && response.user.role === 'truckOwner') {
              location.href = '/truckOwnerHomePage';
            } else {
              location.href = '/customerHomepage';
            }
          }
        },
        error: function(xhr) {
          if(xhr) {
            const errorMsg = xhr.responseJSON?.error || xhr.responseText || 'Login failed';
            alert(`Login error: ${errorMsg}`);
          }            
        }
      });
    });
    
    // Enter key support
    $('#email, #password').keypress(function(e) {
      if (e.which === 13) {
        $('#submit').click();
      }
    });
  });