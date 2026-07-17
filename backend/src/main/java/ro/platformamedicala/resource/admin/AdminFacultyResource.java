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
import ro.platformamedicala.dto.admin.AdminFacultyDTO;
import ro.platformamedicala.dto.admin.AdminFacultyDetailDTO;
import ro.platformamedicala.dto.admin.AdminFacultySubjectDTO;
import ro.platformamedicala.dto.admin.AttachSubjectRequestDTO;
import ro.platformamedicala.dto.admin.FacultyRequestDTO;
import ro.platformamedicala.dto.PageDTO;
import ro.platformamedicala.service.admin.AdminFacultyService;
import ro.platformamedicala.service.admin.AdminSubjectService;

import java.util.UUID;

@Path("/api/admin/faculties")
@RolesAllowed("ADMIN")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class AdminFacultyResource {

    private final AdminFacultyService facultyService;
    private final AdminSubjectService subjectService;

    public AdminFacultyResource(AdminFacultyService facultyService, AdminSubjectService subjectService) {
        this.facultyService = facultyService;
        this.subjectService = subjectService;
    }

    @GET
    public PageDTO<AdminFacultyDTO> list(@QueryParam("page") @DefaultValue("0") int page,
                                         @QueryParam("size") @DefaultValue("20") int size,
                                         @QueryParam("search") String search) {
        return facultyService.list(page, size, search);
    }

    @GET
    @Path("/{id}")
    public AdminFacultyDetailDTO get(@PathParam("id") UUID id) {
        return facultyService.get(id);
    }

    @POST
    public Response create(@Valid FacultyRequestDTO dto) {
        return Response.status(Response.Status.CREATED).entity(facultyService.create(dto)).build();
    }

    @PUT
    @Path("/{id}")
    public AdminFacultyDTO update(@PathParam("id") UUID id, @Valid FacultyRequestDTO dto) {
        return facultyService.update(id, dto);
    }

    @DELETE
    @Path("/{id}")
    public Response delete(@PathParam("id") UUID id) {
        facultyService.delete(id);
        return Response.noContent().build();
    }

    @GET
    @Path("/{facultyId}/subjects")
    public PageDTO<AdminFacultySubjectDTO> listSubjects(@PathParam("facultyId") UUID facultyId,
                                                        @QueryParam("page") @DefaultValue("0") int page,
                                                        @QueryParam("size") @DefaultValue("20") int size) {
        return subjectService.listForFaculty(facultyId, page, size);
    }

    @POST
    @Path("/{facultyId}/subjects")
    public Response attachSubject(@PathParam("facultyId") UUID facultyId, @Valid AttachSubjectRequestDTO dto) {
        return Response.status(Response.Status.CREATED)
                .entity(subjectService.attachToFaculty(facultyId, dto)).build();
    }
}
