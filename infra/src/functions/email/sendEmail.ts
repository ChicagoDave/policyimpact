// infra/src/functions/email/sendEmail.ts
import { SNSEvent, Context } from 'aws-lambda';
import { SES } from 'aws-sdk';
import { NotificationEvent } from '../../types/events';

const ses = new SES();

interface EmailTemplateData {
  articleTitle?: string;
  authorName?: string;
  reviewerName?: string;
  researcherName?: string;
  comments?: string;
  recipientName?: string;
  code?: string;
}

const emailTemplates: Record<string, (data: EmailTemplateData) => { subject: string; body: string }> = {
  ARTICLE_REVIEWED: (data) => ({
    subject: `Article Review Complete: ${data.articleTitle || 'Untitled'}`,
    body: `Dear ${data.recipientName || 'Author'},

Your article "${data.articleTitle || 'Untitled'}" has been reviewed by ${data.reviewerName || 'a reviewer'}.

${data.comments ? `Reviewer comments: ${data.comments}` : ''}

Please log in to view the complete review.

Best regards,
Policy Impact Team`
  }),

  ARTICLE_SUBMITTED: (data) => ({
    subject: `New Article Submission: ${data.articleTitle || 'Untitled'}`,
    body: `Dear ${data.recipientName || 'Editor'},

A new article titled "${data.articleTitle || 'Untitled'}" has been submitted by ${data.authorName || 'an author'}.

Please log in to review the submission.

Best regards,
Policy Impact Team`
  }),

  RESEARCH_SUBMITTED: (data) => ({
    subject: `Research Submitted for ${data.articleTitle || 'Untitled'}`,
    body: `Dear ${data.recipientName || 'Editor'},

New research has been submitted for the article "${data.articleTitle || 'Untitled'}" by ${data.researcherName || 'a researcher'}.

Please log in to review the research and references.

Best regards,
Policy Impact Team`
  }),

  EMAIL_VERIFICATION: (data) => ({
    subject: 'Email Verification - Policy Impact',
    body: `Dear User,

Your verification code is: ${data.code}

This code will expire in 15 minutes.

Best regards,
Policy Impact Team`
  })
};

export const handler = async (event: SNSEvent, context: Context) => {
  try {
    for (const record of event.Records) {
      const notification: NotificationEvent = JSON.parse(record.Sns.Message);

      if (notification.type !== 'EMAIL') {
        console.log(`Skipping non-email notification of type: ${notification.type}`);
        continue;
      }

      const template = emailTemplates[notification.template];

      if (!template) {
        console.error(`Unknown email template: ${notification.template}`);
        continue;
      }

      const email = template(notification.data as EmailTemplateData);

      const params: SES.SendEmailRequest = {
        Destination: {
          ToAddresses: [notification.recipient.email || '']
        },
        Message: {
          Body: {
            Text: {
              Data: email.body,
              Charset: 'UTF-8'
            }
          },
          Subject: {
            Data: email.subject,
            Charset: 'UTF-8'
          }
        },
        Source: process.env.SENDER_EMAIL || 'no-reply@policyimpact.us',
        ConfigurationSetName: `policy-impact-emails-${process.env.STAGE}`
      };

      if (!notification.recipient.email) {
        console.error('No email address provided for recipient');
        continue;
      }

      await ses.sendEmail(params).promise();
    }
  } catch (error) {
    console.error('Error processing email notifications:', error);
    throw error;
  }
};