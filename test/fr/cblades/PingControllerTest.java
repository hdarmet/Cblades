package fr.cblades;

import fr.cblades.controller.PingController;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.summer.*;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;

public class PingControllerTest implements TestSeawave {

    PingController pingController;
    MockDataManagerImpl dataManager;
    MockSecurityManagerImpl securityManager;

    @Before
    public void before() {
        ApplicationManager.set(new ApplicationManagerForTestImpl());
        pingController = new PingController();
        securityManager = (MockSecurityManagerImpl)ApplicationManager.get().getSecurityManager();
        securityManager.register(new MockSecurityManagerImpl.Credential("test", "test", StandardUsers.TEST));
    }

    @Test
    public void testPing() {
        Json result = pingController.ping(params(), Json.createJsonFromString("{}"));
        Assert.assertEquals("Hello World !", result.get("message"));
    }

    @Test
    public void testLogin() {
        Json result = pingController.pingLogin(params(), Json.createJsonFromString("{}"));
        Assert.assertEquals("Connect to Secure World !", result.get("message"));
        Assert.assertEquals(securityManager.getConnection().getId(), "test");
    }

    @Test
    public void testProtectedPing() {
        try {
            pingController.pingProtected(params(), Json.createJsonFromString("{}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not connected", sce.getMessage());
        }
        pingController.pingLogin(params(), Json.createJsonFromString("{}"));
        Assert.assertEquals(securityManager.getConnection().getId(), "test");
        Json result = pingController.pingProtected(params(), Json.createJsonFromString("{}"));
        Assert.assertEquals("Hello Secure World !", result.get("message"));
    }

}
