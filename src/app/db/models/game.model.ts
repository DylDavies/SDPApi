import { ObjectId } from "mongodb";

export default class Game {
    constructor(public name: string, public price: number, public category: string, public creationDate: Date, public id?: ObjectId) {}
}