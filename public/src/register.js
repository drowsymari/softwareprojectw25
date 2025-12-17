$(document).ready(function(){
    $("#submit").click(function() {
      const name = $('#name').val();
      const email = $('#email').val();
      const password = $('#password').val();
      const confirmPassword = $('#confirmPassword').val();
      const role = $('#role').val();

      // Validation
      if (!name || !email || !password || !confirmPassword) {
        alert('Please fill in all required fields');
        return;
      }

      if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }

      const data = {
        name,
        email,
        password,
        role: role || 'customer'
      };

      $.ajax({
        type: "POST",
        url: '/api/v1/user',
        contentType: "application/json",
        data: JSON.stringify(data),
        success: function(response) {
          if(response) {
            alert("Registration successful! Please login.");
            location.href = '/login';
          }
        },
        error: function(xhr) {
          if(xhr) {
            const errorMsg = xhr.responseJSON?.error || xhr.responseText || 'Registration failed';
            alert(`Registration error: ${errorMsg}`);
          }            
        }
      });
    });
    
    // Enter key support
    $('#name, #email, #password, #confirmPassword, #role').keypress(function(e) {
      if (e.which === 13) {
        $('#submit').click();
      }
    });
  });