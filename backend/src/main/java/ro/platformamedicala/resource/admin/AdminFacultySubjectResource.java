package ro.platformamedicala.resource.admin;

import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import ro.platformamedicala.dto.admin.AdminFacultySubjectDTO;
import ro.platformamedicala.dto.admin.AdminQuestionDTO;
import ro.platformamedicala.dto.admin.FacultySubjectRequestDTO;
import ro.platformamedicala.dto.PageDTO;
import ro.platformamedicala.dto.admin.QuestionRequestDTO;
import ro.platformamedicala.service.admin.AdminQuestionService;
import ro.platformamedicala.service.admin.AdminSubjectService;

import java.util.UUID;

@Path("/api/admin/faculty-subjects")
@RolesAllowed("ADMIN")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class AdminFacultySubjectResource {

    private final AdminSubjectService subjectService;
    private final AdminQuestionService questionService;

    public AdminFacultySubjectResource(AdminSubjectService subjectService, AdminQuestionService questionService) {
        this.subjectService = subjectService;
        this.questionService = questionService;
    }

    @GET
    @Path("/{id}")
    public AdminFacultySubjectDTO get(@PathParam("id") UUID id) {
        return subjectService.getLink(id);
    }

    @PUT
    @Path("/{id}")
    public AdminFacultySubjectDTO update(@PathParam("id") UUID id, @Valid FacultySubjectRequestDTO dto) {
        return subjectService.updateLink(id, dto);
    }

    @DELETE
    @Path("/{id}")
    public Response detach(@PathParam("id") UUID id) {
        subjectService.detach(id);
        return Response.noContent().build();
    }

    @GET
    @Path("/{facultySubjectId}/questions")
    public PageDTO<AdminQuestionDTO> listQuestions(@PathParam("facultySubjectId") UUID facultySubjectId,
                                                   @QueryParam("page") @DefaultValue("0") int page,
                                                   @QueryParam("size") @DefaultValue("20") int size) {
        return questionService.listForFacultySubject(facultySubjectId, page, size);
    }

    @POST
    @Path("/{facultySubjectId}/questions")
    public Response createQuestion(@PathParam("facultySubjectId") UUID facultySubjectId,
                                   @Valid QuestionRequestDTO dto) {
        return Response.status(Response.Status.CREATED)
                .entity(questionService.create(facultySubjectId, dto)).build();
    }
}
