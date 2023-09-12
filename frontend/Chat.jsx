import React, { useState, useEffect, useRef } from "react";
import Message from "./Message";
import "./chat.css";
import io from "socket.io-client";
import { toast } from "react-toastify";
import { http } from "../../../../config/axiosConfig";
import moment from "moment";
import InputEmoji from "react-input-emoji";
import Loader from "../../Loader";
const adminInfo = JSON.parse(localStorage.getItem("adminInfo"));

const Chat = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const toastOptions = {
    position: "top-right",
    autoClose: 2000,
    pauseOnHover: true,
    draggable: true,
    theme: "dark",
  };

  const messageEl = useRef(null);

  const ENDPOINT = import.meta.env.VITE_BASE_URL;
  var socket = io(ENDPOINT);
  const [usersData, setUsersData] = useState([]);
  const [messages, setMessages] = useState([]); //for all messages that in a conversation
  const [inputMessage, setIputMessage] = useState("");
  const [receiverId, setReceiverId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [noneBlockj, setNoneBlock] = useState(false);
  const [isEditmsg, setIsEditMsg] = useState({
    status: false,
    message: "",
    id: null,
  });
  const [socketUser, setSocketUser] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([]);

  // const [isEditing, setIsEditing] = useState(false);


  const getAllUser = () => {
    http
      .get("/user/getALLUsers", {
        headers: {
          authorization: `Bearer ${adminInfo?.token}`,
        },
      })
      .then((res) => {
        if (res.data) {
          setUsersData(res.data.body.allUser);
        }
      })
      .catch((err) => {
        console.log(err.message);
      });
  };


  useEffect(() => {
    if (messageEl) {
      messageEl.current.addEventListener("DOMNodeInserted", (event) => {
        const { currentTarget: target } = event;
        target.scroll({ top: target.scrollHeight, behavior: "smooth" });
      });
    }
  }, []);

  useEffect(() => {
    const userID = adminInfo.userExist._id;
    let data = {
      user_id: userID,
    };
    socket.emit("connect_user", data);

    socket.on("connect_listener", function (data) {
      console.log("Connected to socket");
    });

    // for send message by enter key
    $("#send_message").keyup((e) => {
      socket.emit("typing", {
        sender_id: adminInfo.userExist._id,
        receiverId: e.target.name,
      });
      if (e.keyCode === 13) {
        $("#send_button").click();
      }
    });
    socket.on("online_users", (data) => {
      setOnlineUsers(data);
    })
    const box = document.getElementById("chat_div");
    box.style.display = "none";

    return () => {
      socket.disconnect(); // Disconnect the socket when component unmounts
    };
  }, [ENDPOINT]);

  socket.on("typing_listner", (data) => { });

  const deleteMessage = (id) => {
    socket.emit("delete_msg", {
      sender_id: adminInfo.userExist._id,
      receiver_id: receiverId,
      msgId: id,
    });
  };

  const handleSendMessage = (e) => {
    var message = inputMessage; //document.getElementById("send_message");
    if (message !== "") {
      socket.emit("send_message", {
        sender_id: adminInfo.userExist._id,
        receiver_id: receiverId,
        type: "1",
        message: message,
      });
      setIputMessage("");

    } else {
      toast.error("Please fill the Message", toastOptions);
    }
    getAllUser();
  };

  const showDataDiv = () => {
    setNoneBlock(true);
    var element = document.getElementById("mobi");
    element.classList.toggle("showChat");
  };

  function openChat(receiver_id) {

    setNoneBlock(false);
    const box = document.getElementById("chat_div");
    box.style.display = "block";
    var element = document.getElementById("mobi");
    element.classList.toggle("showChat");
    setReceiverId(receiver_id);
    const data = {
      sender_id: adminInfo.userExist._id,
      receiver_id: receiver_id,
    };

    socket.emit("get_chat", data);

    // Unselect the previously selected user
    setSelectedUser(receiver_id);
    setIputMessage("");
  }

  socket.on("send_message_listener", function (data) {
    setMessages((prevMessages) => [...prevMessages, data]);
  });

  socket.on("my_chat", (data) => {
    setMessages(data);
  });

  const handleClick = (messageId, msg) => {
    setIsEditMsg((state) => {
      state.status = true;
      state.message = msg;
      state.id = messageId;
      return { ...state };
    });
    setIputMessage(msg);
  };

  const handdleEdirMsgSend = () => {
    socket.emit("edit_msg", {
      sender_id: adminInfo.userExist._id,
      receiver_id: receiverId,
      id: isEditmsg?.id,
      msg: isEditmsg?.message,
    });
    setIsEditMsg((stete) => {
      stete.status = false;
      return { ...stete };
    });
    setIputMessage("");
  };

  const handdleMessageInputChange = (e) => {
    if (isEditmsg?.status) {
      setIsEditMsg((state) => {
        state.message = e;

        return { ...state };
      });
    }
    setIputMessage(e);

  };


  // Group messages by date
  const groupedMessages = {};
  messages.forEach((message) => {
    const messageDate = moment(message.createdAt).format("YYYY-MM-DD");

    if (!groupedMessages[messageDate]) {
      groupedMessages[messageDate] = [];
    }
    groupedMessages[messageDate].push(message);

  });

  const sortedDates = Object.keys(groupedMessages).sort((a, b) =>
    moment(b, "YYYY-MM-DD").diff(moment(a, "YYYY-MM-DD"))).reverse()
    ;

  const socketUsers = () => {
    http
      .get("/user/socketUsers", {
        headers: {
          authorization: `Bearer ${adminInfo?.token}`,
        },
      })
      .then((res) => {
        if (res.data) {
          setSocketUser(res.data.body);
        }
      })
      .catch((err) => {
        console.log(err.message);
      });
  }

  useEffect(() => {
    window.scrollTo(0, 0);
    getAllUser();
    socketUsers()
  }, []);




  return (

    <>
      {!usersData && !socketUser && !messages ? (<Loader />) : (

        <section className="section">
          <div className="section-header">
            <h1>Chat</h1>
          </div>

          <div className=" section-body  card-body mt-3 text-start  bg-white px-md-4 px-0">
            <div className="chat" id="mobi">
              <div className="row position-relative">
                <div className="col-md-4 chat_list">
                  <div className="left_box">
                    <div className="left_head">
                      <div className="form-group">
                        <div className="input-group">
                          <input
                            type="search"
                            name="search"
                            id="search"
                            className="form-control"
                            placeholder="Search"
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                        <div className="input-group-append">
                          <span>
                            <i className="fa-solid fa-magnifying-glass"></i>
                          </span>
                        </div>
                      </div>
                      {/* <i onclick={openChat} className="fa-solid fa-xmark ml-2 d-md-none"></i>  */}
                      <div className="list-group user_list">
                        {usersData
                          .filter((user) =>
                            user.name
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase())
                          )
                          ?.map((user, index) => {
                            const isOnline = onlineUsers.some((socketUserData) => socketUserData.user_id === user._id);

                            return (
                              <a
                                // className="list-group-item list-group-item-action"
                                className={`list-group-item list-group-item-action  ${user._id === selectedUser ? "selected" : ""
                                  }`}
                                aria-current="true"
                                onClick={() => openChat(user._id)}
                              >

                                <div className="user_name" key={index}>
                                  <div className="user_img">
                                    <img src={`${import.meta.env.VITE_BASE_URL}/images/${user?.image}`} alt="/assets/img/chat4.png" />
                                    {isOnline ? (
                                      <i class="fas fa-circle online"></i>
                                    ) : (
                                      <i class="fas fa-circle offline"></i>
                                    )}

                                  </div>
                                  <h5 className="mb-0">{user.name}</h5>
                                  <h5 className="mb-0 ml-auto text-end">
                                    <small className="mb-2">
                                      {/* {moment(user.lastSeen).fromNow()} */}
                                    </small>
                                  </h5>
                                </div>
                              </a>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  id="chat_div"
                  className="col-md-8"
                  style={{ display: noneBlockj ? "none" : "block" }}
                >
                  <div className="rigth_box">
                    <div className="chat_head d-md-none">
                      <button
                        type="button"
                        className="chat_back_btn"
                        onClick={showDataDiv}
                      >
                        <i
                          style={{ cursor: "pointer" }}
                          className="fa-solid fa-angles-left me-2 "
                        ></i>
                      </button>
                    </div>
                    <div className="chat_body" ref={messageEl}>
                      {sortedDates.map((date) => (
                        <React.Fragment key={date}>
                          <div className="date-header">
                            {moment(date).isSame(moment(), "day")
                              ? "Today"
                              : moment(date).isSame(
                                moment().subtract(1, "day"),
                                "day"
                              )
                                ? "Yesterday"
                                : moment(date).format("DD MMMM")}
                          </div>
                          {groupedMessages[date].map((message, index) => {
                            if (message.sender_id == adminInfo.userExist._id) {
                              return (
                                <div className="send message" key={index}>
                                  <div className="msg">
                                    <p>
                                      {message.message}

                                      <div className="msg_dropdown">
                                        <div class="btn-group">
                                          <button type="button" class="btn btn-white bordre-0" data-toggle="dropdown" aria-expanded="false">
                                            <i className="fa fa-ellipsis-v"></i>
                                          </button>
                                          <div class="dropdown-menu dropdown-menu-right cmsg_dropm">

                                            <button class="dropdown-item" onClick={() => handleClick(message?._id, message?.message)} type="button">
                                              <i className="fas fa-edit p-0" style={{ color: "green", cursor: "pointer", }}></i>
                                              Edit
                                            </button>
                                            <button class="dropdown-item" onClick={() => deleteMessage(message._id)} type="button">
                                              <i className="fa-solid fa-trash p-0" style={{ color: "red", cursor: "pointer", }}></i>
                                              Delete
                                            </button>
                                          </div>
                                        </div>
                                      </div>



                                      <small>
                                        {moment(message.createdAt).format(
                                          "hh:mm A"
                                        )}
                                      </small>
                                    </p>
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <div className="received message" key={index}>
                                  <div className="msg">
                                    <p>
                                      {message.message}
                                      <small>
                                        {moment(message.createdAt).format(
                                          "hh:mm A"
                                        )}
                                      </small>
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                          })}
                        </React.Fragment>
                      ))}

                      <div className="chat_footer">
                        <InputEmoji
                          value={inputMessage}

                          onChange={handdleMessageInputChange}
                          name={receiverId}
                          cleanOnEnter
                          onEnter={isEditmsg?.status ? handdleEdirMsgSend : handleSendMessage}
                          placeholder="Type a message..."
                          className="form-control"
                        />
                        <button
                          id="send_button"
                          onClick={isEditmsg?.status ? handdleEdirMsgSend : handleSendMessage}
                        >
                          <i className="fa-regular fa-paper-plane"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


      )}



    </>

  );
};

export default Chat;
