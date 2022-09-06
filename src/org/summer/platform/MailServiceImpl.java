package org.summer.platform;

import org.summer.annotation.SingletonScoped;

import java.io.UnsupportedEncodingException;
import java.util.Date;

import javax.activation.DataHandler;
import javax.activation.DataSource;
import javax.activation.FileDataSource;
import javax.mail.BodyPart;
import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.Multipart;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMessage;
import javax.mail.internet.MimeMultipart;

@SingletonScoped
public class MailServiceImpl implements MailService {

    @Override
    public void sendEmail(
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
            String ... attachments
    ) {
        try{
            Session session = PlatformManager.get().getMailSession();
            session.setDebug(true);
            MimeMessage msg = new MimeMessage(session);
            msg.addHeader("Content-type", contentType);
            msg.addHeader("format", format);
            msg.addHeader("Content-Transfer-Encoding", transfertEncoding);
            msg.setFrom(new InternetAddress(from, personal));
            msg.setReplyTo(InternetAddress.parse(replyTo, false));
            msg.setSubject(subject, encoding);
            msg.setSentDate(new Date());
            msg.setRecipients(Message.RecipientType.TO, InternetAddress.parse(toEmail, false));
            if (attachments.length==0) {
                msg.setText(body, encoding);
            } else {
                BodyPart messageBodyPart = new MimeBodyPart();
                messageBodyPart.setText(body);
                Multipart multipart = new MimeMultipart();
                multipart.addBodyPart(messageBodyPart);
                for (String attachment : attachments) {
                    messageBodyPart = new MimeBodyPart();
                    DataSource source = new FileDataSource(attachment);
                    messageBodyPart.setDataHandler(new DataHandler(source));
                    messageBodyPart.setFileName(attachment);
                    multipart.addBodyPart(messageBodyPart);
                }
                msg.setContent(multipart);
            }
            // Send message
            PlatformManager.get().sendMail(session, msg);
        } catch (MessagingException | UnsupportedEncodingException me) {
            throw new SummerPlatformException("Mail exception", me);
        }
    }

    @Override
    public void sendEmail(
            String toEmail,
            String subject,
            String body,
            String from,
            String ... attachments
    ) {
        this.sendEmail(
            toEmail, subject, body, from, from, from,
            "text/HTML; charset=UTF-8", "flowed",
            "UTF-8", "8bit", attachments
        );
    }

}
