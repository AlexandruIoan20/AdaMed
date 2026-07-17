package ro.platformamedicala.resource.admin;

import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import ro.platformamedicala.dto.admin.AdminQuestionDTO;
import ro.platformamedicala.dto.admin.QuestionRequestDTO;
import ro.platformamedicala.service.admin.AdminQuestionService;

import java.util.UUID;

@Path("/api/admin/questions")
@RolesAllowed("ADMIN")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class AdminQuestionResource {

    private final AdminQuestionService questionService;

    public AdminQuestionResource(AdminQuestionService questionService) {
        this.questionService = questionService;
    }

    @GET
    @Path("/{id}")
    public AdminQuestionDTO get(@PathParam("id") UUID id) {
        return questionService.get(id);
    }

    @PUT
    @Path("/{id}")
    public AdminQuestionDTO update(@PathParam("id") UUID id, @Valid QuestionRequestDTO dto) {
        return questionService.update(id, dto);
    }

    @DELETE
    @Path("/{id}")
    public Response delete(@PathParam("id") UUID id) {
        questionService.delete(id);
        return Response.noContent().build();
    }
}
