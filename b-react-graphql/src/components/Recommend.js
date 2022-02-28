import { useQuery } from "@apollo/client";
import BooksTable from "./BooksTable";
import { ALL_BOOKS_BY_GENRE, ME } from "../queries";
import { useEffect } from "react";

const Recommend = (props) => {
  const user = useQuery(ME);
  const favoriteGenreBooks = useQuery(ALL_BOOKS_BY_GENRE);

  useEffect(() => {
    favoriteGenreBooks.refetch({ genre: user.data?.me.favoriteGenre });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.data]);

  if (!props.show) {
    return null;
  }

  if (user.loading || favoriteGenreBooks.loading) {
    return <div>loading...</div>;
  }

  return (
    <div>
      <h2>recommendations</h2>
      <p>
        books in your favorite genre{" "}
        <strong>{user.data.me.favoriteGenre}</strong>
      </p>
      <BooksTable books={favoriteGenreBooks.data.allBooks} />
    </div>
  );
};

export default Recommend;
