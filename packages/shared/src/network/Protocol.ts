import { encode, decode } from "@msgpack/msgpack";
import { FoodType, SnakeSegment } from "../types/GameTypes";

export enum MessageType {
    
    C_S_JOIN,
    C_S_INPUT,
    C_S_COLLISION_REPORT,
    C_S_PING,

    S_C_JOIN_ACCEPTED,
    S_C_GAME_STATE,
    S_C_PLAYER_DIED,
    S_C_FOOD_SPAWNED,
    S_C_FOOD_EATEN,
    S_C_PLAYER_JOINED,
    S_C_KILL_FEED,
    S_C_PONG,
}

export interface KillFeedPayload {
    killerName: string;
    victimName: string;
    method: 'wall' | 'snake';
    cash?: number;
    timestamp: number;
}

export type CollisionReportPayload = {
    victimId: string;
    killerId: string;
};

export type JoinPayload = { username: string, slitherAmount:number };
export type InputPayload = { targetAngle: number; isBoosting: boolean; sequence: number; };


export type SnakeStateUpdate = {
    id: string;
    username: string;
    color: number;
    segments: SnakeSegment[];
    length: number;
    radius: number;
    isBoosting: boolean;
    score: number;
    cash:number;
    isSpectator:boolean;
};

export type CompactSnakeStateUpdate = {
    id: string;
    username: string;
    color: number;
    head: SnakeSegment;
    length: number;
    radius: number;
    isBoosting: boolean;
    score: number;
    cash:number;
    isSpectator:boolean;
};

export type InitialStatePayload = {
    snakes: SnakeStateUpdate[];
    foods: FoodType[];
    leaderboard: { id: string, username: string, score: number }[];
    lastProcessedInput: { [playerId: string]: number };
};

export type JoinAcceptedPayload = {
    playerId: string;
    initialState: InitialStatePayload,
    color: number,
    startingAmount:number 
};


export type PlayerJoinedPayLoad = {
    snake: SnakeStateUpdate;
};



export interface MinimapData {
    grid: boolean[][];
}

export interface GameStatePayload {
    snakes: CompactSnakeStateUpdate[];
    leaderboard: { id: string, username: string, score: number }[];
    lastProcessedInput: { [playerId: string]: number };
    totalPlayer:number;
    minimap?: MinimapData;
}

export type PlayerDiedPayload = {
    playerId: string,
    deathFoods: FoodType[];
};
export type FoodSpawnedPayload = { foods: FoodType[] };
export type FoodEatenPayload = { foodIds: number[] };

export function serialize(type: MessageType, payload: any): Buffer {
    const data = [type, payload];
    return Buffer.from(encode(data));
}

export function deserialize(buffer: Buffer): [MessageType, any] {
    const [type, payload] = decode(buffer) as [MessageType, any];
    return [type, payload];
}