<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>{{$title}}</title>
    <style>
      /* -------------------------------------
          GLOBAL RESETS
      ------------------------------------- */
      
      @font-face {
        font-family: 'Abril Fatface';
        src: url(data:application/font-woff2;charset=utf-8;base64,<?php echo config(
        	'base64.fonts.abril_fatface_woff2'
        ); ?>) format('woff2'),
            url(data:application/font-woff;charset=utf-8;base64,<?php echo config(
            	'base64.fonts.abril_fatface_woff'
            ); ?>) format('woff');
        font-weight: normal;
        font-style: normal;
      }

      img {
        border: none;
        -ms-interpolation-mode: bicubic;
        max-width: 100%; 
      }

      body {
        background-color: #f6f6f6;
        font-family: 'Raleway', 'Helvetica', 'Arial';
        -webkit-font-smoothing: antialiased;
        font-size: 16px;
        line-height: 1.4;
        margin: 0;
        padding: 0;
        -ms-text-size-adjust: 100%;
        -webkit-text-size-adjust: 100%; 
      }

      table {
        border-collapse: separate;
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
        width: 100%; }
        table td {
          font-family: 'Raleway', 'Helvetica', 'Arial';
          font-size: 16px;
          vertical-align: top; 
      }

      /* -------------------------------------
          BODY & CONTAINER
      ------------------------------------- */

      .body {
        background-color: #f6f6f6;
        width: 100%; 
      }

      /* Set a max-width, and make it display as block so it will automatically stretch to that width, but will also shrink down on a phone or something */
      .container {
        display: block;
        margin: 0 auto !important;
        /* makes it centered */
        max-width: 600px;
        padding: 10px;
        width: 600px; 
      }

      /* This should also be a block element, so that it will fill 100% of the .container */
      .content {
        box-sizing: border-box;
        display: block;
        margin: 0 auto;
        max-width: 600px;
        padding: 10px; 
      }

      /* -------------------------------------
          HEADER, FOOTER, MAIN
      ------------------------------------- */
      .main {
        background: #f5f4ef;
        border-radius: 3px;
        width: 100%; 
      }

      .wrapper {
        box-sizing: border-box;
        padding: 30px; 
      }

      .content-block {
        padding-bottom: 10px;
        padding-top: 10px;
      }

      .header {
        clear: both;
        height: 40px;
        width: 100%; 
        background-color: #391d4d;
        line-height: 40px;
      }
        .header td,
        .header p,
        .header span,
        .header a {
          color: #ffffff;
          font-size: 12px;
          text-align: center; 
      }

      .footer {
        padding-top: 15px;
        padding-bottom: 15px;
        clear: both;
        margin-top: 10px;
        text-align: center;
        width: 100%; 
        background-color: #ece9e0;
      }
        .footer td,
        .footer p,
        .footer span,
        .footer a {
          color: #352240;
          font-size: 12px;
          text-align: center; 
      }

      .header-logo {
        padding-left: 30px;
        max-width: 50%;
        max-height: 50%;
        vertical-align: middle;
      }

      .footer-logo {
        max-width: 60%;
        max-height: 60%;
      }

      /* -------------------------------------
          TYPOGRAPHY
      ------------------------------------- */
      h1,
      h2,
      h3,
      h4 {
        color: #3c3c3c;
        font-family: 'Raleway', 'Helvetica', 'Arial';
        font-weight: 800;
        margin: 0;
      }

      h1 {
        font-family: 'Abril Fatface', 'Helvetica Black', 'Arial Black', 'Arial';
        font-size: 36px;
        font-weight: 400;
        text-align: left;
        line-height: 1;
        max-width: 375px;
        margin-bottom: 25px; 
      }
      
      h3 {
        font-size: 16px;
      }

      p,
      ul,
      ol {
        color: #3c3c3a;
        font-family: 'Raleway', 'Helvetica', 'Arial';
        font-size: 16px;
        font-weight: normal;
        margin: 0;
        
      }
        p li,
        ul li,
        ol li {
          list-style-position: inside;
          margin-left: 5px; 
      }

      a {
        color: #372145;
        text-decoration: underline; 
      }

      /* -------------------------------------
          BUTTONS
      ------------------------------------- */
      .btn {
        box-sizing: border-box;
        width: 100%; }
        .btn > tbody > tr > td {
          padding-bottom: 15px; }
        .btn table {
          width: auto; 
      }
        .btn table td {
          background-color: #ffffff;
          border-radius: 5px;
          text-align: center; 
      }
        .btn a {
          background-color: #ffffff;
          border: solid 1px #3498db;
          border-radius: 5px;
          box-sizing: border-box;
          color: #3498db;
          cursor: pointer;
          display: inline-block;
          font-size: 16px;
          font-weight: bold;
          margin: 0;
          padding: 12px 25px;
          text-decoration: none;
          text-transform: capitalize; 
      }

      .btn-primary table td {
        background-color: #3498db; 
      }

      .btn-primary a {
        background-color: #3498db;
        border-color: #3498db;
        color: #ffffff; 
      }

      /* -------------------------------------
          OTHER STYLES THAT MIGHT BE USEFUL
      ------------------------------------- */
      .last {
        margin-bottom: 0; 
      }

      .first {
        margin-top: 0; 
      }

      .align-center {
        text-align: center; 
      }

      .align-right {
        text-align: right; 
      }

      .align-left {
        text-align: left; 
      }

      .clear {
        clear: both; 
      }

      .mt0 {
        margin-top: 0; 
      }

      .mb0 {
        margin-bottom: 0; 
      }

      .preheader {
        color: transparent;
        display: none;
        height: 0;
        max-height: 0;
        max-width: 0;
        opacity: 0;
        overflow: hidden;
        mso-hide: all;
        visibility: hidden;
        width: 0; 
      }

      .powered-by a {
        text-decoration: none; 
      }

      hr {
        border: 0;
        border-bottom: 1px solid #d8d6d9;
        margin: 20px 0; 
      }

      /* -------------------------------------
          RESPONSIVE AND MOBILE FRIENDLY STYLES
      ------------------------------------- */
      @media only screen and (max-width: 620px) {
        table[class=body] h1 {
          font-size: 28px !important;
          margin-bottom: 10px !important; 
        }
        table[class=body] p,
        table[class=body] ul,
        table[class=body] ol,
        table[class=body] td,
        table[class=body] span,
        table[class=body] a {
          font-size: 16px !important; 
        }
        table[class=body] .wrapper,
        table[class=body] .article {
          padding: 10px !important; 
        }
        table[class=body] .content {
          padding: 0 !important; 
        }
        table[class=body] .container {
          padding: 0 !important;
          width: 100% !important; 
        }
        table[class=body] .main {
          border-left-width: 0 !important;
          border-radius: 0 !important;
          border-right-width: 0 !important; 
        }
        table[class=body] .btn table {
          width: 100% !important; 
        }
        table[class=body] .btn a {
          width: 100% !important; 
        }
        table[class=body] .img-responsive {
          height: auto !important;
          max-width: 100% !important;
          width: auto !important; 
        }
      }

      /* -------------------------------------
          PRESERVE THESE STYLES IN THE HEAD
      ------------------------------------- */
      @media all {
        .ExternalClass {
          width: 100%; 
        }
        .ExternalClass,
        .ExternalClass p,
        .ExternalClass span,
        .ExternalClass font,
        .ExternalClass td,
        .ExternalClass div {
          line-height: 100%; 
        }
        .apple-link a {
          color: inherit !important;
          font-family: inherit !important;
          font-size: inherit !important;
          font-weight: inherit !important;
          line-height: inherit !important;
          text-decoration: none !important; 
        }
        #MessageViewBody a {
          color: inherit;
          text-decoration: none;
          font-size: inherit;
          font-family: inherit;
          font-weight: inherit;
          line-height: inherit;
        }
        .btn-primary table td:hover {
          background-color: #34495e !important; 
        }
        .btn-primary a:hover {
          background-color: #34495e !important;
          border-color: #34495e !important; 
        } 
      }
    </style>
  </head>
  <body class="">
    <span class="preheader">{{$title}}</span>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body">
      <tr>
        <td>&nbsp;</td>
        <td class="container">
          <div class="content">

            <!-- START HEADER -->
            <div class="header">
              <a href="https://noteable.co/">
                <img class="header-logo" alt="Noteable.co" src="<?php echo config(
                	'mailtemplate.images.header_logo'
                ); ?>" />
              </a>
            </div>
             <!-- END HEADER -->

            @yield("content")

            <!-- START FOOTER -->
            <div class="footer">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="content-block">
                    <a href="https://noteable.co/">
                      <img class="footer-logo" alt="Noteable.co" src="<?php echo config(
                      	'mailtemplate.images.footer_logo'
                      ); ?>" />
                    </a>
                    <br/><br/> 
                    <span class="apple-link">Copyright © 2019 Noteable.co</span>
                    <br/><br/> 
                    Noteable <br/> 
                    Sturlasgade 12B <br/> 
                    Copenhagen S 2300 <br/> 
                    Denmark
                  </td>
                </tr>
              </table>
            </div>
            <!-- END FOOTER -->

          </div>
        </td>
        <td>&nbsp;</td>
      </tr>
    </table>
  </body>
</html>
