package ro.platformamedicala.resource;

import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.jwt.JsonWebToken;
import ro.platformamedicala.dto.quiz.SubjectDetailDTO;
import ro.platformamedicala.dto.quiz.SubjectListItemDTO;
import ro.platformamedicala.entities.User;
import service.auth.CurrentUserService;
import service.quiz.SubjectQueryService;

import java.util.List;
import java.util.UUID;

@Path("/api/subjects")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class SubjectResource {
    private final SubjectQueryService subjectQueryService;
    private final CurrentUserService currentUserService;

    @Inject
    JsonWebToken jwt;

    public SubjectResource(SubjectQueryService subjectQueryService, CurrentUserService currentUserService) {
        this.subjectQueryService = subjectQueryService;
        this.currentUserService = currentUserService;
    }

    @GET
    public List<SubjectListItemDTO> list() {
        User user = currentUserService.require(jwt);
        return subjectQueryService.listForUser(user);
    }

    @GET
    @Path("/{subjectId}")
    public SubjectDetailDTO get(@PathParam("subjectId") UUID subjectId) {
        User user = currentUserService.require(jwt);
        return subjectQueryService.getDetail(user, subjectId);
    }
}
