package ro.platformamedicala.service.admin;

import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

public final class AdminErrors {

    public record Body(String message) {}

    private AdminErrors() {}

    public static WebApplicationException conflict(String message) {
        return build(Response.Status.CONFLICT, message);
    }

    public static WebApplicationException notFound(String message) {
        return build(Response.Status.NOT_FOUND, message);
    }

    public static WebApplicationException badRequest(String message) {
        return build(Response.Status.BAD_REQUEST, message);
    }

    private static WebApplicationException build(Response.Status status, String message) {
        return new WebApplicationException(
                Response.status(status).entity(new Body(message)).type(MediaType.APPLICATION_JSON).build());
    }
}
