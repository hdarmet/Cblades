package fr.cblades.controller;

import org.summer.FileSpecification;
import org.summer.controller.ControllerSunbeam;
import org.summer.controller.SummerControllerException;
import org.summer.controller.Verifier;
import org.summer.data.Synchronizer;
import org.summer.platform.PlatformManager;

import javax.persistence.PersistenceException;
import java.util.Map;

public interface CommonEntities extends ControllerSunbeam {

    default FileSpecification getImage(Map<String, Object> params, String name, String folder) {
        try {
            String webName = (String)params.get(name);
            int minusPos = webName.indexOf('-');
            int pointPos = webName.indexOf('.');
            String imageName = webName.substring(0, minusPos)+webName.substring(pointPos);
            return new FileSpecification()
                .setName(imageName)
                .setStream(PlatformManager.get().getInputStream(folder+imageName));
        } catch (PersistenceException pe) {
            throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
        }
    }

    default Verifier checkComments(Verifier verifier, boolean full) {
        if (full) {
            verifier.each("comments", cJson -> verify(cJson)
                .checkRequired("version")
                .checkRequired("date")
                .checkRequired("text")
            );
        }
        verifier.each("comments", cJson -> verify(cJson)
            .checkMinSize("text", 2)
            .checkMaxSize("text", 19995)
            .checkDate("date")
        );
        return verifier;
    }

     default Synchronizer writeComments(Synchronizer synchronizer) {
        synchronizer.syncEach("comments", (cJson, comment)->sync(cJson, comment)
             .write("version")
             .writeDate("date")
             .write("text")
         );
        return synchronizer;
     }

     default Synchronizer readComments(Synchronizer synchronizer) {
     synchronizer.readEach("comments", (hJson, hex)->sync(hJson, hex)
             .read("id")
             .read("version")
             .readDate("date")
             .read("text")
         );
         return synchronizer;
     }

    default Synchronizer readAuthor(Synchronizer synchronizer) {
        synchronizer.readLink("author", (pJson, account)->sync(pJson, account)
            .read("id")
            .read("login", "access.login")
            .read("firstName")
            .read("lastName")
            .read("avatar")
        );
        return synchronizer;
    }

}
