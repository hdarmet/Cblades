package fr.cblades.controllers;

import fr.cblades.StandardUsers;
import fr.cblades.controller.PresentationController;
import fr.cblades.controller.ThemeController;
import fr.cblades.domain.MessageModel;
import fr.cblades.domain.MessageModelCategory;
import fr.cblades.domain.MessageModelStatus;
import fr.cblades.domain.Presentation;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.summer.*;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;
import org.summer.data.DataManipulatorSunbeam;

public class PresentationControllerTest implements TestSeawave, CollectionSunbeam, DataManipulatorSunbeam {

    PresentationController presentationController;
    MockDataManagerImpl dataManager;
    MockPlatformManagerImpl platformManager;
    MockSecurityManagerImpl securityManager;

    @Before
    public void before() {
        ApplicationManager.set(new ApplicationManagerForTestImpl());
        presentationController = new PresentationController();
        dataManager = (MockDataManagerImpl) ApplicationManager.get().getDataManager();
        dataManager.openPersistenceUnit("default");
        platformManager = (MockPlatformManagerImpl) ApplicationManager.get().getPlatformManager();
        securityManager = (MockSecurityManagerImpl) ApplicationManager.get().getSecurityManager();
        securityManager.register(new MockSecurityManagerImpl.Credential("admin", "admin", StandardUsers.ADMIN));
        securityManager.register(new MockSecurityManagerImpl.Credential("someone", "someone", StandardUsers.USER));
        securityManager.register(new MockSecurityManagerImpl.Credential("someoneelse", "someoneelse", StandardUsers.USER));
        platformManager.setTime(1739879980962L);
    }

    @Test
    public void tryToListPresentationsByCategoryWithoutGivingParameters() {
        securityManager.doConnect("admin", 0);
        try {
            presentationController.getByCategory(params("page", "0"), null);
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The category is missing or invalid (null)", sce.getMessage());
        }
    }

    Presentation presentation1() {
        return setEntityId(new Presentation()
            .setPublished(true)
            .setCategory("Disclaimer")
            .setText("First version of the disclaimer")
            .setPresentationVersion("1.01"),
        1L);
    }

    Presentation presentation2() {
        return setEntityId(new Presentation()
            .setPublished(false)
            .setCategory("Disclaimer")
            .setText("Second version of the disclaimer")
            .setPresentationVersion("1.02"),
        2L);
    }

    Presentation presentation3() {
        return setEntityId(new Presentation()
            .setPublished(true)
            .setCategory("Who are we ?")
            .setText("First version of the Who are we ?")
            .setPresentationVersion("1.02"),
        3L);
    }

    @Test
    public void listPresentationsByCategory() {
        dataManager.register("createQuery", null, null,
                "select p from Presentation p where p.category = :category");
        dataManager.register("setParameter", null, null,
                "category", "Disclaimer");
        dataManager.register("getResultList", arrayList(
                presentation1(), presentation2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = presentationController.getByCategory(params("category", "Disclaimer"), null);
        Assert.assertEquals("[{" +
            "\"presentationVersion\":\"1.01\"," +
            "\"id\":1," +
            "\"text\":\"First version of the disclaimer\"," +
            "\"published\":true," +
            "\"category\":\"Disclaimer\"," +
            "\"version\":0" +
        "},{" +
            "\"presentationVersion\":\"1.02\"," +
            "\"id\":2," +
            "\"text\":\"Second version of the disclaimer\"," +
            "\"published\":false," +
            "\"category\":\"Disclaimer\"," +
            "\"version\":0" +
        "}]", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void listLivePresentations() {
        dataManager.register("createQuery", null, null,
                "select p from Presentation p where p.published = true");
        dataManager.register("getResultList", arrayList(
                presentation1(), presentation2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = presentationController.getPublished(params("category", "Disclaimer"), null);
        Assert.assertEquals("[{" +
            "\"presentationVersion\":\"1.01\"," +
            "\"id\":1," +
            "\"text\":\"First version of the disclaimer\"," +
            "\"published\":true," +
            "\"category\":\"Disclaimer\"," +
            "\"version\":0" +
        "},{" +
            "\"presentationVersion\":\"1.02\"," +
            "\"id\":2," +
            "\"text\":\"Second version of the disclaimer\"," +
            "\"published\":false," +
            "\"category\":\"Disclaimer\"," +
            "\"version\":0" +
        "}]", result.toString());
        dataManager.hasFinished();
    }

}
