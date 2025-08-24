import { Router } from 'express';
import { Singleton } from '../../models/classes/Singleton';
import { LoggingService } from '../../services/LoggingService';
import { UserService } from '../../services/UserService';
import { IUser } from '../../db/models/MUser.model';
import { authenticationMiddleware } from '../../middleware/auth.middleware';
import IPayloadUser from '../../models/interfaces/IPayloadUser.interface';

const router = Router();
const userService = Singleton.getInstance(UserService);
const logger = Singleton.getInstance(LoggingService);

router.use(authenticationMiddleware);

router.get('/', async (req, res) => {
    try{
        const { id } =  req.user as IPayloadUser;
        const user = await userService.getUser(id);

        if(!user){
            logger.error("User was not returned");
            return res.status(404).send("User not found");
        }

        return res.status(200).json(user);
    } catch (error){
        logger.error(`Error fetching user.`, error);
        return res.status(500).send('Internal Server Error');
    }
})

router.patch('/', async (req,res) => {
    try{
        const { id } = req.user as IPayloadUser;
        const updateData: Partial<IUser> = req.body;

        //data cleaning 
        delete updateData.googleId;
        delete (updateData as Partial<IUser>).createdAt;
        delete (updateData as Partial<IUser>)._id;

        if(Object.keys(updateData).length === 0){
            return res.status(400).send("No valid fields provided");
        }

        const updatedUser = await userService.editUser(id, updateData);

        if(!updatedUser){
            return res.status(404).send("Updated user not found")
        }

        return res.status(200).json(updatedUser);
        
    } catch(error){
        logger.error(`Error updating user.`, error);
        return res.status(500).send('Internal Server Error' );
    }
})

export default router;

