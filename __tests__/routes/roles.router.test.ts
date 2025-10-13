import request from 'supertest';
import express, { NextFunction, Request, Response } from 'express';
import rolesRouter from '../../src/app/routes/roles/router';
import RoleService from '../../src/app/services/RoleService';

// Mock the dependencies
jest.mock('../../src/app/services/RoleService');
jest.mock('../../src/app/middleware/permission.middleware', () => ({
    hasPermission: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
}));

const app = express();
app.use(express.json());
app.use('/api/roles', rolesRouter);

describe('Roles Router', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/roles', () => {
        it('should return 200 and the role tree on success', async () => {
            const mockTree = { name: 'Root', children: [] };
            (RoleService.getRoleTree as jest.Mock).mockResolvedValue(mockTree);

            const response = await request(app).get('/api/roles');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockTree);
        });

        it('should return 500 on a service error', async () => {
            (RoleService.getRoleTree as jest.Mock).mockRejectedValue(new Error('DB Error'));
            const response = await request(app).get('/api/roles');
            expect(response.status).toBe(500);
            expect(response.body.message).toContain('Error fetching role tree');
        });
    });

    describe('POST /api/roles', () => {
        const roleData = { name: 'New Role', permissions: [], parent: 'parentId', color: '#FFF' };

        it('should return 201 and the created role on success', async () => {
            (RoleService.createRole as jest.Mock).mockResolvedValue({ _id: 'newId', ...roleData });

            const response = await request(app).post('/api/roles').send(roleData);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('_id', 'newId');
            expect(RoleService.createRole).toHaveBeenCalledWith(roleData.name, roleData.permissions, roleData.parent, roleData.color);
        });

        it('should return 400 if required fields are missing', async () => {
           const incompleteData = {...roleData, name: null}
            const response = await request(app).post('/api/roles').send(incompleteData);
            expect(response.status).toBe(400);
            expect(response.text).toContain('Missing required fields');
        });

        it('should return 500 on service error', async () => {
            (RoleService.createRole as jest.Mock).mockRejectedValue(new Error('DB Error'));
            const response = await request(app).post('/api/roles').send(roleData);
            expect(response.status).toBe(500);
            expect(response.body.message).toContain('Error creating role');
        });
    });

    describe('PATCH /api/roles', () => {
        const roleUpdateData = { _id: 'role123', name: 'Updated Role', permissions: [], parent: 'parentId', color: '#000' };

        it('should return 200 and the updated role on success', async () => {
            (RoleService.updateRole as jest.Mock).mockResolvedValue(roleUpdateData);

            const response = await request(app).patch('/api/roles').send(roleUpdateData);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(roleUpdateData);
            expect(RoleService.updateRole).toHaveBeenCalledWith(roleUpdateData._id, roleUpdateData.name, roleUpdateData.permissions, roleUpdateData.parent, roleUpdateData.color);
        });

        it('should return 400 if _id is missing', async () => {
            const { _id, ...incompleteData } = roleUpdateData;
            const response = await request(app).patch('/api/roles').send(incompleteData);
            expect(response.status).toBe(400);
        });

        it('should return 500 on service error', async () => {
            (RoleService.updateRole as jest.Mock).mockRejectedValue(new Error('DB Error'));
            const response = await request(app).patch('/api/roles').send(roleUpdateData);
            expect(response.status).toBe(500);
            expect(response.body.message).toContain('Error updating role');
        });
    });

    describe('DELETE /api/roles/:id', () => {
        it('should return 200 on successful deletion', async () => {
            (RoleService.deleteRole as jest.Mock).mockResolvedValue({});
            
            const response = await request(app).delete('/api/roles/role123');

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Role deleted successfully');
            expect(RoleService.deleteRole).toHaveBeenCalledWith('role123');
        });

        it('should return 400 if the service throws an error', async () => {
            (RoleService.deleteRole as jest.Mock).mockRejectedValue(new Error('Role in use'));
            const response = await request(app).delete('/api/roles/role123');
            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Error deleting role');
        });
    });

    describe('PATCH /api/roles/:roleId/parent', () => {
        it('should return 200 and the updated role on success', async () => {
            const updatedRole = { _id: 'role123', parent: 'newParent' };
            (RoleService.updateRoleParent as jest.Mock).mockResolvedValue(updatedRole);
            
            const response = await request(app)
                .patch('/api/roles/role123/parent')
                .send({ newParentId: 'newParent' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(updatedRole);
            expect(RoleService.updateRoleParent).toHaveBeenCalledWith('role123', 'newParent');
        });

        it('should return 400 if newParentId is missing', async () => {
            const response = await request(app)
                .patch('/api/roles/role123/parent')
                .send({});
            
            expect(response.status).toBe(400);
            expect(response.text).toContain('Missing required field');
        });

        it('should return 400 if the service throws a circular dependency error', async () => {
            (RoleService.updateRoleParent as jest.Mock).mockRejectedValue(new Error('Circular dependency detected'));

            const response = await request(app)
                .patch('/api/roles/role123/parent')
                .send({ newParentId: 'newParent' });
            
            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Circular dependency detected');
        });
    });
});
