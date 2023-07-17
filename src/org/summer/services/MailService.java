package org.summer.services;

public interface MailService {

    void sendEmail(
        String toEmail,
        String subject,
        String body,
        String from,
        String personal,
        String replyTo,
        String contentType,
        String format,
        String encoding,
        String transfertEncoding,
        String ... attachments);

    void sendEmail(
        String toEmail,
        String subject,
        String body,
        String from,
        String ... attachments);
}
