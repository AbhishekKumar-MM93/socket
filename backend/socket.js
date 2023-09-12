import SocketUsers from "./Model/SocketUser.js";
import Messages from "./Model/Messages.js";
import Users from "./Model/user.js";
import Notifications from "./Model/Notifications.js";
import mongoose from "mongoose";
import user from "./Model/user.js";
import SocketUser from "./Model/SocketUser.js";
// import { send_push_notification } from "./helper/helpers.js";

const setupSocket = (io) => {
  io.on("connection", function (socket, next) {
    // Emit the list of online users to all connected clients
    const updateOnlineUsers = async () => {
      try {
        const onlineUsers = await SocketUsers.find({ status: "online" }).select(
          "user_id"
        );
        io.emit("online_users", onlineUsers);
      } catch (error) {
        console.error("Error updating online users:", error);
      }
    };

    socket.on("connect_user", async function (connect_listener) {
      try {
        const socket_id = socket.id;
        const { user_id } = connect_listener;

        // Check if the user is already connected
        let check_user = await SocketUsers.findOne({ user_id });

        // Create or update socket id if the user is connected or not
        if (check_user) {
          await SocketUsers.updateOne(
            { user_id },
            { status: "online", socket_id }
          );
        } else {
          await SocketUsers.create({
            user_id,
            socket_id,
            status: "online",
          });
        }

        // Emit the list of online users
        updateOnlineUsers();

        let success_message = {
          success_message: "connected successfully",
        };
        socket.emit("connect_listener", success_message);
      } catch (error) {
        console.error("Error connecting user:", error);
      }
    });

    socket.on("disconnect", async function () {
      try {
        const socket_id = socket.id;
        await SocketUsers.deleteOne({ socket_id });

        // Emit the updated list of online users when a user disconnects
        updateOnlineUsers();

        console.log("Socket user disconnected");
      } catch (error) {
        console.error("Error disconnecting user:", error);
      }
    });
    /**check if sender or receiver allready have chat
     * or having first time
     */

    socket.on("send_message", async function (get_data) {
      try {
        // Step 1: Query for existing message data between sender and receiver
        var user_data = await Messages.findOne({
          $or: [
            {
              sender_id: get_data.sender_id,
              receiver_id: get_data.receiver_id,
            },
            {
              receiver_id: get_data.sender_id,
              sender_id: get_data.receiver_id,
            },
          ],
        });
        if (user_data) {
          let create_message = await Messages.create({
            sender_id: get_data.sender_id,
            receiver_id: get_data.receiver_id,
            type: get_data.type,
            message: get_data.message,
            thumbnail: get_data.thumbnail ? get_data.thumbnail : "",
            constant_id: user_data.constant_id,
            created: Math.round(new Date().getTime() / 1000),
            updated: Math.round(new Date().getTime() / 1000),
          });
          // receiver  details for push notification
          let get_user_details = await Users.findOne({
            _id: get_data.receiver_id,
          });
          let getdata = await Messages.aggregate([
            {
              $lookup: {
                from: "user",
                localField: "sender_id",
                foreignField: "_id",
                as: "sender",
              },
            },
            {
              $lookup: {
                from: "user",
                localField: "receiver_id",
                foreignField: "_id",
                as: "receiver",
              },
            },
            { $match: { _id: create_message._id } },
          ]);

          if (getdata) {
            getdata = getdata.length > 0 ? getdata[0] : {};
            let get_socket_id = await SocketUsers.findOne({
              user_id: get_data.receiver_id,
            });
            // console.log(get_socket_id, "---get_id--out--");
            if (get_socket_id) {
              // console.log(get_socket_id, "---get_id----");

              io.to(get_socket_id.socket_id).emit(
                "send_message_listener",
                getdata
              );
            }

            socket.emit("send_message_listener", getdata);
          }
        } else {
          const create_message = await Messages.create({
            sender_id: get_data.sender_id,
            receiver_id: get_data.receiver_id,
            type: get_data.type,
            message: get_data.message,
            thumbnail: get_data.thumbnail ? get_data.thumbnail : "",
            constant_id: Math.round(new Date().getTime() / 1000),
            created: Math.round(new Date().getTime() / 1000),
            updated: Math.round(new Date().getTime() / 1000),
          });
          let getdata = await Messages.aggregate([
            {
              $lookup: {
                from: "user",
                localField: "sender_id",
                foreignField: "_id",
                as: "sender",
              },
            },
            {
              $lookup: {
                from: "user",
                localField: "receiver_id",
                foreignField: "_id",
                as: "receiver",
              },
            },
            { $match: { _id: create_message._id } },
          ]);
          if (getdata) {
            getdata = getdata.length > 0 ? getdata[0] : {};
            let get_socket_id = await SocketUsers.findOne({
              user_id: get_data.receiver_id,
            });
            // console.log(get_socket_id, "---get_id--out--");
            if (get_socket_id) {
              // console.log(get_socket_id, "---get_id----");
              io.to(get_socket_id.socket_id).emit(
                "send_message_listener",
                getdata
              );
            }
            socket.emit("send_message_listener", getdata);
          }
        }
      } catch (error) {
        throw error;
      }
    });

    socket.on("get_chat", async function (data) {
      // getting chat of sender or receiver
      const constant_check = await Messages.findOne({
        $or: [
          { sender_id: data.sender_id, receiver_id: data.receiver_id },
          { receiver_id: data.sender_id, sender_id: data.receiver_id },
        ],
      });

      if (constant_check) {
        // Aggregating chat messages along with sender and receiver details
        var get_message = await Messages.aggregate([
          {
            $lookup: {
              from: "user",
              localField: "sender_id",
              foreignField: "_id",
              as: "sender",
            },
          },
          {
            $lookup: {
              from: "user",
              localField: "receiver_id",
              foreignField: "_id",
              as: "receiver",
            },
          },
          {
            $match: {
              constant_id: constant_check.constant_id,
              deleted_by: {
                $ne: mongoose.Types.ObjectId(data.sender_id),
              },
            },
          },
          {
            $sort: {
              created: 1,
            },
          },
        ]);

        socket.emit("my_chat", get_message);
      }
    });

    socket.on("chat_list", async function (data) {
      let id = mongoose.Types.ObjectId(data.sender_id);

      let get_data_chat_list = await Messages.aggregate([
        // Match messages that are sent or received by the given user and are not deleted
        {
          $match: {
            $or: [{ sender_id: id }, { receiver_id: id }],
            deleted_by: { $ne: id },
          },
        },

        // Group messages by their conversation ID, keeping the last message in each group
        {
          $group: {
            _id: "$constant_id",
            doc: { $last: "$$ROOT" },
            unread_count: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ["$is_read", "0"] },
                      { $eq: ["$receiver_id", id] },
                    ],
                  },
                  then: 1,
                  else: 0,
                },
              },
            },
          },
        },
        // // Replace root document with merged data including unread_count
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [{ unread_count: "$unread_count" }, "$doc"],
            },
          },
        },

        {
          $sort: {
            createdAt: -1,
          },
        },
      ]);
      socket.emit("chat_list", get_data_chat_list);
    });

    socket.on("delete_msg", async (data) => {
      try {
        const { sender_id, receiver_id, msgId } = data;

        if (sender_id && receiver_id && msgId) {
          const deleteMsg = await Messages.findByIdAndDelete({ _id: msgId });

          const constant_check = await Messages.findOne({
            $or: [
              { sender_id: sender_id, receiver_id: receiver_id },
              { receiver_id: sender_id, sender_id: receiver_id },
            ],
          });
          if (constant_check) {
            // Aggregating chat messages along with sender and receiver details
            var get_message = await Messages.aggregate([
              {
                $lookup: {
                  from: "user",
                  localField: "sender_id",
                  foreignField: "_id",
                  as: "sender",
                },
              },
              {
                $lookup: {
                  from: "user",
                  localField: "receiver_id",
                  foreignField: "_id",
                  as: "receiver",
                },
              },
              {
                $match: {
                  constant_id: constant_check.constant_id,
                  deleted_by: {
                    $ne: mongoose.Types.ObjectId(data.sender_id),
                  },
                },
              },
              {
                $sort: {
                  created: 1,
                },
              },
            ]);
            socket.emit("my_chat", get_message);
          }
        }
      } catch (err) {}
    });
    socket.on("edit_msg", async (data) => {
      try {
        const { sender_id, receiver_id, id, msg } = data;
        if (sender_id && receiver_id && id && msg) {
          await Messages.updateOne({ _id: id }, { $set: { message: msg } });
          const constant_check = await Messages.findOne({
            $or: [
              { sender_id: sender_id, receiver_id: receiver_id },
              { receiver_id: sender_id, sender_id: receiver_id },
            ],
          });
          if (constant_check) {
            // Aggregating chat messages along with sender and receiver details
            var get_message = await Messages.aggregate([
              {
                $lookup: {
                  from: "user",
                  localField: "sender_id",
                  foreignField: "_id",
                  as: "sender",
                },
              },
              {
                $lookup: {
                  from: "user",
                  localField: "receiver_id",
                  foreignField: "_id",
                  as: "receiver",
                },
              },
              {
                $match: {
                  constant_id: constant_check.constant_id,
                  deleted_by: {
                    $ne: mongoose.Types.ObjectId(data.sender_id),
                  },
                },
              },
              {
                $sort: {
                  created: 1,
                },
              },
            ]);

            socket.emit("my_chat", get_message);
          }
        }
      } catch (err) {
        console.log("edit msg soket err : -", err);
      }
    });
    socket.on("typing", async (data) => {
      let user = await SocketUser.findOne({ user_id: data.receiverId });
      io.to(user?.socket_id).emit("typing_listner", { is_typing: 1 });
    });
  });
};

export default setupSocket;
