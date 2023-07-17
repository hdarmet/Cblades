package org.summer.platform;

import com.google.cloud.storage.*;

import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.Session;
import javax.mail.Transport;
import java.io.*;
import java.nio.channels.Channels;
import java.nio.channels.ReadableByteChannel;
import java.nio.channels.WritableByteChannel;
import java.util.Properties;

public class GAEPlatformManagerImpl extends AbstractPlatformManagerImpl  {

    String bucket = "";

    public GAEPlatformManagerImpl(String bucket) {
        this.bucket = bucket;
    }

    @Override
    public InputStream getInputStream(String filePath) {
        Storage storage = StorageOptions.getDefaultInstance().getService();
        BlobId blobId = BlobId.of(this.bucket, filePath);
        Blob blob = storage.get(blobId);
        if (blob != null) {
            ReadableByteChannel channel = blob.reader();
            return Channels.newInputStream(channel);
        }
        return null;
    }

    @Override
    public OutputStream getOutputStream(String filePath) {
        Storage storage = StorageOptions.getDefaultInstance().getService();
        BlobId blobId = BlobId.of(this.bucket, filePath);
        Blob blob = storage.get(blobId);
        if (blob == null) {
            blob = storage.create(BlobInfo.newBuilder(blobId).build());
        }
        WritableByteChannel channel = blob.writer();
        return Channels.newOutputStream(channel);
    }

    @Override
    public Session getMailSession() {
        Properties props = new Properties();
        return Session.getInstance(props);
    }

    @Override
    public void sendMail(Session session, Message msg) {
        try {
            Transport.send(msg);
        } catch (MessagingException me) {
            throw new SummerPlatformException("Mail exception", me);
        }
    }

}
