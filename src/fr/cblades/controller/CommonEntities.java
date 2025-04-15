package fr.cblades.controller;

import fr.cblades.domain.Account;
import fr.cblades.domain.Faction;
import fr.cblades.domain.Sheet;
import org.summer.FileSpecification;
import org.summer.controller.ControllerSunbeam;
import org.summer.controller.SummerControllerException;
import org.summer.controller.Verifier;
import org.summer.data.BaseEntity;
import org.summer.data.Synchronizer;
import org.summer.platform.FileSunbeam;
import org.summer.platform.PlatformManager;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Logger;

public interface CommonEntities extends ControllerSunbeam, FileSunbeam {

    static final Logger log = Logger.getLogger("summer");

    default FileSpecification getFile(Map<String, Object> params, String name, String folder) {
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

    default String saveFile(FileSpecification file, String baseName, String path, String webPath) {
        String fileName = baseName + "." + file.getExtension();
        String webName = baseName + "-" + PlatformManager.get().now() + "." + file.getExtension();
        copyStream(file.getStream(), PlatformManager.get().getOutputStream(path + fileName));
        log.info("Save: " + path + fileName + " for: " + webPath + webName);
        return webPath + webName;
    }

    default void checkComments(Verifier verifier) {
        verifier.each("comments", cJson -> verify(cJson)
            .checkRequired("version")
            .checkRequired("date")
            .checkDate("date")
            .checkRequired("text")
            .checkString("text")
            .checkMinSize("text", 2)
            .checkMaxSize("text", 19995)
            .checkDate("date")
        );
    }

    default void writeComments(Synchronizer synchronizer) {
        synchronizer.syncEach("comments", (cJson, comment)->sync(cJson, comment)
             .write("version")
             .writeDate("date")
             .write("text")
         );
    }

    default void readComments(Synchronizer synchronizer) {
        synchronizer.readEach("comments", (hJson, hex)->sync(hJson, hex)
             .read("id")
             .read("version")
             .readDate("date")
             .read("text")
         );
    }

    default void checkNewComment(Verifier verifier) {
        verifier
            .checkString("newComment")
            .checkMinSize("newComment", 2)
            .checkMaxSize("newComment", 200);
    }

    default void writeAuthor(Synchronizer synchronizer, EntityManager em) {
        synchronizer.writeRef("author.id", "author", (Integer id) -> {
            Account account = Account.find(em, id);
            if (account == null) {
                throw new SummerControllerException(404, "Unknown Account with id %d", id);
            }
            return account;
        });
    }

    default void readAuthor(Synchronizer synchronizer) {
        synchronizer.readLink("author", (pJson, account)->sync(pJson, account)
            .read("id")
            .read("login", "access.login")
            .read("firstName")
            .read("lastName")
            .read("avatar")
        );
    }


    default void checkSheets(Verifier verifier) {
        verifier.each("sheets", cJson->verify(cJson)
            .checkInteger("version")
            .checkRequired("ordinal")
            .checkInteger("ordinal")
            .checkRequired("name")
            .checkString("name")
            .checkMinSize("name", 2)
            .checkMaxSize("name", 200)
            .checkPattern("name", "[\\d\\s\\w]+")
            .checkRequired("description")
            .checkString("description")
            .checkMinSize("description", 2)
            .checkMaxSize("description", 19995)
        );
    }

    default void writeSheets(Synchronizer synchronizer) {
        synchronizer.syncEach("sheets", (cJson, comment)->sync(cJson, comment)
            .write("version")
            .write("ordinal")
            .write("name")
            .write("description")
        );
    }

    default void readSheets(Synchronizer synchronizer) {
        synchronizer.readEach("sheets", (pJson, sheet)->sync(pJson, sheet)
            .read("id")
            .read("name")
            .read("description")
            .read("icon")
            .read("path")
        );
    }

    default FileSpecification storeSheetImages(
            FileSpecification[] files,
            long id,
            List<Sheet> sheets,
            String entityName,
            String path,
            String webPath
    ) {
        Set<String> processed = new HashSet<>();
        String exceptions = "";
        FileSpecification mainFile = null;
        if (files != null) {
            for (FileSpecification file : files) {
                int ordinalIdx = file.getName().lastIndexOf("-");
                if (ordinalIdx < 0) {
                    if (processed.contains("f")) {
                        exceptions += String.format("Only one %s file must be loaded.\n", entityName);
                    }
                    else {
                        mainFile = file;
                        processed.add("f");
                    }
                } else {
                    boolean isIcon = file.getName().indexOf("icon-") == 0;
                    int ordinal = Integer.parseInt(file.getName().substring(ordinalIdx + 1));
                    Sheet sheet = sheets.size()>ordinal?sheets.get(ordinal):null;
                    if (isIcon) {
                        if (sheet == null) {
                            exceptions += String.format("No sheet with number %d found for Path.\n", ordinal);
                        }
                        else if (processed.contains("p"+ordinal)) {
                            exceptions += String.format("Only one Path file must be loaded.\n", ordinal);
                        }
                        else {
                            sheet.setIcon(saveFile(file,
                                    "sheeticon" + id + "_" + ordinal,
                                    path, webPath
                            ));
                            processed.add("p"+ordinal);
                        }
                    } else {
                        if (sheet == null) {
                            exceptions += String.format("No sheet with number %d found for Icon.\n", ordinal);
                        }
                        else if (processed.contains("i"+ordinal)) {
                            exceptions += String.format("Only one Icon file must be loaded for sheet %d.\n", ordinal);
                        }
                        else {
                            sheet.setPath(saveFile(file,
                                "sheet" + id + "_" + ordinal,
                                path, webPath
                            ));
                            processed.add("i"+ordinal);
                        }
                    }
                }
            }
        }
        for (Sheet sheet: sheets) {
            if (sheet.getIcon().isEmpty()) {
                exceptions += String.format("Sheet number %d does not have an icon.\n", sheet.getOrdinal());
            }
            if (sheet.getPath().isEmpty()) {
                exceptions += String.format("Sheet number %d does not have a path.\n", sheet.getOrdinal());
            }
        }
        if (!exceptions.isEmpty()) {
            throw new SummerControllerException(400, exceptions);
        }
        return mainFile;
    }

    enum Usage {
        CREATE(true, false),
        UPDATE(false, false),
        PROPOSE(true, true),
        AMEND(false, true);

        final boolean creation;
        final boolean propose;

        Usage(boolean creation, boolean propose) {
            this.creation = creation;
            this.propose = propose;
        }
    }

}
