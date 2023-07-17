package org.summer.platform;

import org.summer.SummerException;

import javax.mail.*;
import java.io.*;
import java.util.Properties;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;

public class LocalPlatformManagerImpl extends AbstractPlatformManagerImpl  {

    String basePath = "";
    Properties mailParams= new Properties();
    String mailFrom = "";
    String mailPassword = "";

    public LocalPlatformManagerImpl(String basePath) {
        this.basePath = basePath;
    }

    @Override
    public InputStream getInputStream(String filePath) {
        try {
            return new FileInputStream(basePath + filePath);
        }
        catch (FileNotFoundException fnfe) {
            throw new SummerException(String.format("File %s", basePath + filePath));
        }
    }

    @Override
    public OutputStream getOutputStream(String filePath) {
        try {
            return new FileOutputStream(basePath + filePath);
        }
        catch (FileNotFoundException fnfe) {
            throw new SummerException(String.format("File %s", basePath + filePath));
        }
    }

    public LocalPlatformManagerImpl setMailProperties(String ... params) {
        for (int index=0; index<params.length; index+=2) {
            this.mailParams.put(params[index], params[index+1]);
        }
        return this;
    }

    public LocalPlatformManagerImpl setMailCredentials(String from, String password) {
        this.mailFrom = from;
        this.mailPassword = password;
        return this;
    }

    @Override
    public Session getMailSession() {
        return Session.getInstance(this.mailParams);
    }

    @Override
    public void sendMail(Session session, Message msg) {
        try {
            Transport transport = session.getTransport("smtp");
            transport.connect(
                (String)this.mailParams.get("mail.smtp.host"),
                Integer.parseInt((String)this.mailParams.get("mail.smtp.port")),
                this.mailFrom, this.mailPassword);
            transport.sendMessage(msg, msg.getAllRecipients());
        } catch (MessagingException me) {
            throw new SummerPlatformException("Mail exception", me);
        }
    }

}
