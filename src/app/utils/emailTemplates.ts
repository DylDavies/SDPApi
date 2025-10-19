/**
 * Email Template Utilities for TutorCore
 * Provides reusable email template generation with consistent branding and dark mode support
 */

interface IEmailButton {
    text: string;
    url: string;
}

/**
 * Generates a branded email template with TutorCore styling
 * @param title The email title/heading
 * @param content The main HTML content of the email
 * @param button Optional call-to-action button
 * @returns Complete HTML email string
 */
export function generateEmailTemplate(
    title: string,
    content: string,
    button?: IEmailButton
): string {
    const buttonHtml = button ? `
        <a href="${button.url}" class="button">${button.text}</a>
    ` : '';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <style>
        body {
            font-family: Roboto, "Helvetica Neue", sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #2855b6;
            padding: 20px;
            text-align: center;
        }
        .header img {
            width: 80px;
        }
        .content {
            padding: 30px;
            line-height: 1.6;
            color: #333;
        }
        .content h1 {
            font-size: 24px;
            color: #333;
            margin-top: 0;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        .details-table td {
            padding: 8px;
            border-bottom: 1px solid #eaeaea;
        }
        .details-table td:first-child {
            font-weight: bold;
            width: 120px;
        }
        .footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #777;
            background-color: #f9f9f9;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            margin-top: 20px;
            background-color: #2855b6;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
        }
        .highlight {
            padding: 12px;
            background-color: #e3f2fd;
            border-left: 4px solid #2855b6;
            margin: 20px 0;
            border-radius: 4px;
        }

        @media (prefers-color-scheme: dark) {
            body {
                background-color: #121212;
            }
            .container {
                background-color: #222222;
                box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            }
            .content {
                color: #eeeeee;
            }
            .content h1 {
                color: #eeeeee;
            }
            .details-table td {
                border-bottom-color: #444444;
            }
            .footer {
                background-color: #1a1a1a;
                color: #aaaaaa;
            }
            .button {
                background-color: #5c85d6 !important;
                color: #ffffff !important;
            }
            .highlight {
                background-color: #1a3a5c;
                border-left-color: #5c85d6;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://tutorcore.works/assets/logo_circle.png" alt="TutorCore Logo">
        </div>
        <div class="content">
            <h1>${title}</h1>
            ${content}
            ${buttonHtml}
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} TutorCore. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `.trim();
}

/**
 * Formats a date for display in emails
 * @param date The date to format
 * @returns Formatted date string (e.g., "January 15, 2025")
 */
export function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Formats a date and time for display in emails
 * @param date The date to format
 * @returns Formatted datetime string (e.g., "January 15, 2025 at 2:30 PM")
 */
export function formatDateTime(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Creates a details table for emails
 * @param details Key-value pairs to display
 * @returns HTML table string
 */
export function createDetailsTable(details: Record<string, string>): string {
    const rows = Object.entries(details)
        .map(([key, value]) => `
            <tr>
                <td>${key}:</td>
                <td>${value}</td>
            </tr>
        `)
        .join('');

    return `
        <table class="details-table">
            ${rows}
        </table>
    `;
}
