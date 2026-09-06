import { useState, useEffect } from 'react';
import { userService } from '../services/api';

export const BoardModerator = () => {
  const [content, setContent] = useState<string>('');

  useEffect(() => {
    userService.getModeratorBoard()
      .then(response => {
        setContent(response.data);
      })
      .catch(error => {
        setContent(`Error: ${error.response?.data?.message || error.message}`);
      });
  }, []);

  return (
    <div className="board">
      <h1>Moderator Board</h1>
      <div className="board-content">
        <p>{content}</p>
      </div>
    </div>
  );
};