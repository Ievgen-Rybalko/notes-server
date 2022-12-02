import app from "../src/app";
import request from "supertest";
import { Server } from "http";
import {
  addNote,
  signUp,
  getNotes,
  editNote,
  defaultEditedNoteTitle,
  defaultEditedNoteBody,
  defaultPassword,
  defaultEmail,
} from "./utils";
import { User } from "../src/models/user/user";
import { INoteData } from "../src/interfaces/note/note";
import mongoose from "mongoose";
import { UserEmailVerification } from "../src/models/user_email_verification/user_email_verification";

describe("Note Requests", () => {
  /**
   * Store the server instance to cancel later.
   * If not canceled Jest cannot exit.
   */
  let server: Server;

  /**
   * Store the superagent instance to send requests.
   */
  let agent: request.SuperAgentTest;

  beforeAll(async (done) => {
    server = app.listen(4000, async () => {
      agent = request.agent(server);
      const authRes = await signUp(agent);
      expect(authRes.status).toEqual(200);
      expect(authRes.body.success).toEqual(true);
      done();
    });
  });

  afterAll(async (done) => {
    await User.remove({}).exec();
    await UserEmailVerification.remove({}).exec();
    for (const connection of mongoose.connections) {
      await connection.close();
    }
    return server && server.close(done);
  });

  it("should create a new note", async () => {
    const res = await addNote(agent);
    expect(res.status).toEqual(200);
    expect(res.body.success).toEqual(true);
  });

  it("should not create a note with invalid body", async () => {
    const res = await addNote(agent, {
      body: "",
      title: "Test Note",
    });
    expect(res.status).toEqual(400);
    expect(res.body.success).toEqual(false);
  });

  it("should not create a note with invalid title", async () => {
    const res = await addNote(agent, {
      body: "Test note body.",
      title: "",
    });
    expect(res.status).toEqual(400);
    expect(res.body.success).toEqual(false);
  });

  it("should get notes", async () => {
    const createRes = await addNote(agent);
    expect(createRes.status).toEqual(200);
    expect(createRes.body.success).toEqual(true);

    const res = await getNotes(agent);
    expect(res.status).toEqual(200);

    const notes = res.body.data as INoteData[];

    expect(notes.length).toBeGreaterThan(0);
  });

  it("should not get notes with negative page number", async () => {
    const createRes = await addNote(agent);
    expect(createRes.status).toEqual(200);
    expect(createRes.body.success).toEqual(true);

    const res = await getNotes(agent, "-1");

    expect(res.status).toEqual(500);
    expect(res.body.success).toEqual(false);
  });

  it("should edit note", async () => {
    const createRes = await addNote(agent);
    expect(createRes.status).toEqual(200);
    expect(createRes.body.success).toEqual(true);

    const res = await getNotes(agent);
    expect(res.status).toEqual(200);

    const notes = res.body.data as INoteData[];

    expect(notes.length).toBeGreaterThan(0);

    const editRes = await editNote(agent, notes[0]._id);

    expect(editRes.status).toEqual(200);
    expect(editRes.body.success).toEqual(true);

    const getEditedNotesRes = await getNotes(agent);
    expect(getEditedNotesRes.status).toEqual(200);

    const editedNotes = getEditedNotesRes.body.data as INoteData[];

    expect(editedNotes.length).toBeGreaterThan(0);
    expect(editedNotes[0].title).toEqual(defaultEditedNoteTitle);
    expect(editedNotes[0].body).toEqual(defaultEditedNoteBody);
  });

  it("should not edit note with not id", async () => {
    const createRes = await addNote(agent);
    expect(createRes.status).toEqual(200);
    expect(createRes.body.success).toEqual(true);

    const res = await getNotes(agent);
    expect(res.status).toEqual(200);

    const notes = res.body.data as INoteData[];

    expect(notes.length).toBeGreaterThan(0);

    const editRes = await agent
      .post("/note/editnote")
      .auth(defaultEmail, defaultPassword)
      .send();

    expect(editRes.status).toEqual(500);
    expect(editRes.body.success).toEqual(false);
  });

  it("should not edit note with incorrect body", async () => {
    const createRes = await addNote(agent);
    expect(createRes.status).toEqual(200);
    expect(createRes.body.success).toEqual(true);

    const res = await getNotes(agent);
    expect(res.status).toEqual(200);

    const notes = res.body.data as INoteData[];

    expect(notes.length).toBeGreaterThan(0);

    const editRes = await agent
      .post("/note/editnote")
      .auth(defaultEmail, defaultPassword)
      .send({
        id: notes[0]._id,
      });

    expect(editRes.status).toEqual(500);
    expect(editRes.body.success).toEqual(false);
  });
});
