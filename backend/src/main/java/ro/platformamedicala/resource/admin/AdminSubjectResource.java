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
import ro.platformamedicala.dto.admin.AdminSubjectDTO;
import ro.platformamedicala.dto.PageDTO;
import ro.platformamedicala.dto.admin.SubjectRequestDTO;
import ro.platformamedicala.service.admin.AdminSubjectService;

import java.util.UUID;

@Path("/api/admin/subjects")
@RolesAllowed("ADMIN")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class AdminSubjectResource {

    private final AdminSubjectService subjectService;

    public AdminSubjectResource(AdminSubjectService subjectService) {
        this.subjectService = subjectService;
    }

    @GET
    public PageDTO<AdminSubjectDTO> list(@QueryParam("page") @DefaultValue("0") int page,
                                         @QueryParam("size") @DefaultValue("20") int size,
                                         @QueryParam("search") String search) {
        return subjectService.list(page, size, search);
    }

    @POST
    public Response create(@Valid SubjectRequestDTO dto) {
        return Response.status(Response.Status.CREATED).entity(subjectService.create(dto)).build();
    }

    @PUT
    @Path("/{id}")
    public AdminSubjectDTO update(@PathParam("id") UUID id, @Valid SubjectRequestDTO dto) {
        return subjectService.update(id, dto);
    }

    @DELETE
    @Path("/{id}")
    public Response delete(@PathParam("id") UUID id) {
        subjectService.delete(id);
        return Response.noContent().build();
    }
}
