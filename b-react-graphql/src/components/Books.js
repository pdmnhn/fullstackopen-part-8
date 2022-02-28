import { useState } from "react";
import useBooks from "../customHooks/useBooks";
import BooksTable from "./BooksTable";

const Books = (props) => {
  const [filter, setFilter] = useState("");
  const { books, genres, loading } = useBooks();

  if (!props.show) {
    return null;
  }

  if (loading) {
    return <div>loading...</div>;
  }

  const onGenreClick = (genre) => {
    return () => {
      setFilter(genre);
    };
  };

  return (
    <div>
      <h2>books</h2>
      {filter && (
        <p>
          in genre <strong>{filter}</strong>
        </p>
      )}
      <BooksTable
        books={books.filter((book) =>
          filter ? book.genres.includes(filter) : book
        )}
      />
      {genres.map((genre) => (
        <button key={genre} onClick={onGenreClick(genre)}>
          {genre}
        </button>
      ))}
      <button
        onClick={() => {
          setFilter("");
        }}
      >
        all genres
      </button>
    </div>
  );
};

export default Books;
