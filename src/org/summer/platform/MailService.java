package org.summer.platform;

public interface MailService {
    void sendEmail(String toEmail, String subject, String body, String ... attachments);
}
