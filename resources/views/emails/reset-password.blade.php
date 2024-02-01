@extends('layouts.mail-master')

@section("content")
<!-- START CENTERED WHITE CONTAINER -->
<table role="presentation" class="main">
  <!-- START MAIN CONTENT AREA -->
  <tr>
    <td class="wrapper">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <h1>Need a new password? We got you!</h1>
            <p>Hello!</p>
            <p>It seems like you want to reset your password for <a href='https://noteable.co'>noteable.co</a></p>
            <br/>
            <p>Please click this link to get going:</p>
            <a href="{{$resetTokenUrl}}">{{$resetTokenUrl}}</a>
            <hr/>
            <p>
                If you did not ask for a password reset, please let us know by<br/>
                sending an email to <a href='mailto:contact@noteable.co'>contact@noteable.co</a><br/>              
            </p>
            <br/>
            <h3>Kind regards from the Noteable team</h3>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <!-- END MAIN CONTENT AREA -->
</table>
<!-- END CENTERED WHITE CONTAINER -->
@endsection
