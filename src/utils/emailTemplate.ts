/**
 * Generates a premium HTML email template for OTP verification based on the DineFive brand.
 * 
 * @param otp - The 6-digit verification code
 * @param userName - The name of the user (optional)
 * @returns HTML string
 */
export const getOtpEmailTemplate = (otp: string, userName: string = 'Valued Member') => {
    const brandColor = '#F2994A'; // DineFive Orange
    const darkColor = '#2D1D16';  // DineFive Dark Brown
    const secondaryColor = '#6FCF97'; // DineFive Green swipe color

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DineFive - Verify Your Email</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8f9fa;
            color: ${darkColor};
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.05);
        }
        .header {
            background: linear-gradient(135deg, ${darkColor} 0%, #4a2e23 100%);
            padding: 40px 20px;
            text-align: center;
        }
        .logo-text {
            font-size: 32px;
            font-weight: 800;
            letter-spacing: -1px;
            margin: 0;
        }
        .logo-dine { color: #ffffff; }
        .logo-five { color: ${brandColor}; }
        
        .content {
            padding: 40px;
            text-align: center;
        }
        h1 {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 16px;
            color: ${darkColor};
        }
        p {
            font-size: 16px;
            line-height: 1.6;
            color: #666;
            margin-bottom: 24px;
        }
        .otp-container {
            background: #fdf2e9;
            border: 2px dashed ${brandColor};
            border-radius: 16px;
            padding: 24px;
            margin: 32px 0;
            display: inline-block;
        }
        .otp-code {
            font-size: 42px;
            font-weight: 800;
            letter-spacing: 8px;
            color: ${brandColor};
            margin: 0;
        }
        .footer {
            padding: 30px;
            background-color: #fcfcfc;
            text-align: center;
            border-top: 1px solid #eeeeee;
        }
        .footer p {
            font-size: 12px;
            color: #999;
            margin: 0;
        }
        .social-link {
            display: inline-block;
            margin: 0 10px;
            color: ${brandColor};
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
        }
        .tagline {
            color: ${brandColor};
            font-weight: 700;
            font-size: 14px;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-top: 10px;
        }
        .highlight-green {
            color: ${secondaryColor};
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo-text">
                <span class="logo-dine">Dine</span><span class="logo-five">Five</span>
            </div>
            <div class="tagline">$5.99 EVERY MEAL</div>
        </div>
        <div class="content">
            <h1>Welcome, ${userName}!</h1>
            <p>Thank you for choosing DineFive. To provide you with the <span class="highlight-green">best dining experience</span> at amazing value, we need to verify your email address.</p>
            <p>Use the verification code below to complete your registration:</p>
            
            <div class="otp-container">
                <div class="otp-code">${otp}</div>
            </div>
            
            <p style="font-size: 14px;">This code will expire in <strong>10 minutes</strong>. If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DineFive. All rights reserved.</p>
            <div style="margin-top: 15px;">
                <a href="#" class="social-link">Website</a>
                <a href="#" class="social-link">Support</a>
                <a href="#" class="social-link">Privacy Policy</a>
            </div>
        </div>
    </div>
</body>
</html>
  `;
};
