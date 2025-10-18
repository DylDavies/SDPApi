import { Router } from "express";
import { authenticationMiddleware } from "../../middleware/auth.middleware";
import EventService from "../../services/EventService";
import IPayloadUser from "../../models/interfaces/IPayloadUser.interface";

const router = Router();
const eventService = EventService;
router.use(authenticationMiddleware);

/**
 * @route POST /api/events
 * @desc Create a new event
 * @access Private
 */
router.post("/", async (req, res) => {
    try {
        const { bundleId, studentId, subject, startTime, duration } = req.body;
        const user = req.user as IPayloadUser;

        const newEvent = await eventService.createEvent(bundleId, studentId, user.id, subject, new Date(startTime), duration);
        res.status(201).json(newEvent);
    } catch (error) {
        res.status(400).json({ message: "Error creating event", error: (error as Error).message });
    }
});

/**
 * @route GET /api/events
 * @desc Get all events for the current user
 * @access Private
 */
router.get("/", async (req, res) => {
    try {
        const user = req.user as IPayloadUser;
        const events = await eventService.getEvents(user.id);
        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ message: "Error fetching events", error: (error as Error).message });
    }
});

/**
 * @route PATCH /api/events/:eventId
 * @desc Update an event
 * @access Private
 */
router.patch("/:eventId", async (req, res) => {
    try {
        const { eventId } = req.params;
        const updatedEvent = await eventService.updateEvent(eventId, req.body);
        if (!updatedEvent) {
            return res.status(404).json({ message: "Event not found." });
        }
        res.status(200).json(updatedEvent);
    } catch (error) {
        res.status(400).json({ message: "Error updating event", error: (error as Error).message });
    }
});

/**
 * @route DELETE /api/events/:eventId
 * @desc Delete an event
 * @access Private
 */
router.delete("/:eventId", async (req, res) => {
    try {
        const { eventId } = req.params;
        await eventService.deleteEvent(eventId);
        res.status(204).send();
    } catch (error) {
        if ((error as Error).message === "Event not found.") {
            return res.status(404).json({ message: "Error deleting event", error: (error as Error).message });
        }
        res.status(400).json({ message: "Error deleting event", error: (error as Error).message });
    }
});

/**
 * @route PATCH /api/events/:eventId/rate
 * @desc Rate an event
 * @access Private
 */
router.patch("/:eventId/rate", async (req, res) => {
    try {
        const { eventId } = req.params;
        const { rating } = req.body;
        const updatedEvent = await eventService.rateEvent(eventId, rating);
        res.status(200).json(updatedEvent);
    } catch (error) {
        res.status(400).json({ message: "Error rating event", error: (error as Error).message });
    }
});

/**
 * @route GET /api/events/bundle/:bundleId
 * @desc Get all events for a specific bundle
 * @access Private
 */
router.get("/bundle/:bundleId", async (req, res) => {
    try {
        const { bundleId } = req.params;
        const events = await eventService.getEventsByBundle(bundleId);
        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ message: "Error fetching events for bundle", error: (error as Error).message });
    }
});

export default router;