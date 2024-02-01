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
            <h3>Dear {{$userFullName}},</h3>
            <br/>
            <p>Thanks for signing up and welcome to Noteable – we hope you find it a
              valuable tool in your tastings going forward. Our aim is for you to have
              all of your tastings always at hand, and for Noteable to replace all of
			  your notes and journals.
			  <br/><br/>  
              We would love to get feedback, so please reach out. But most
              importantly we hope you will use our tool for all of your tastings, staff
              training, events or the like.</p>
            <br/>
            <h3>How to get started with tastings:</h3>
			<br/>
            <ol>
              <li>Log in at <a href="{{$loginUrl}}">{{$loginUrl}}</a></li>
              <li>Select <b>New Tasting</b> from the menu</li>
              <li>Choose your <b>tasting method</b></li>
              <li>Let Noteable <b>guide you</b> through your tasting</li>
              <li>Save your <b>tasting summary</li>
              <li>Look up your previous tastings at any time under <b>'My Tastings'</b></li>
            </ol>
<br>
			<h3>How to join an event:</h3>
			<br>
            <ol>
              <li>Choose 'Events' in the menu</a></li>
              <li>Find your event by searcing with the event code</li>
              <li>Click the event and request to join</li>
            </ol>
            <br/>
            <p>We hope you have lots of great tastings. Cheers!</p>
            <br/>
            <p>The Noteable team</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <!-- END MAIN CONTENT AREA -->
</table>
<!-- END CENTERED WHITE CONTAINER -->
@endsection
